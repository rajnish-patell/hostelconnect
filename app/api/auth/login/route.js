import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: { message: "Mobile/Email and password are required." },
      }, { status: 400 });
    }

    let resolvedEmail = email.trim();
    const admin = createAdminClient();
    const cleanNumber = resolvedEmail.replace(/\D/g, "");

    // 1. If identifier is a mobile number, lookup and sync parent account
    if (cleanNumber.length >= 10 && !resolvedEmail.includes("@")) {
      const { data: parent } = await admin
        .from("parents")
        .select("*")
        .eq("phone", cleanNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (parent) {
        resolvedEmail = parent.email || `${cleanNumber}@parent.hostelconnect.in`;

        // Check if Auth user exists or needs password sync
        const { data: usersData } = await admin.auth.admin.listUsers();
        let existingUser = usersData?.users?.find(u =>
          u.email?.toLowerCase() === resolvedEmail.toLowerCase() ||
          u.id === parent.user_id
        );

        if (existingUser) {
          // Sync Auth user password to match the entered password if it's the registered parent
          await admin.auth.admin.updateUserById(existingUser.id, {
            password: password,
            email_confirm: true,
          });

          if (!parent.user_id) {
            await admin.from("parents").update({ user_id: existingUser.id }).eq("id", parent.id);
          }
        } else {
          // Auto-create Auth user for this parent
          const { data: newAuth, error: createErr } = await admin.auth.admin.createUser({
            email: resolvedEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              full_name: `${parent.first_name} ${parent.last_name || ""}`.trim(),
              phone: cleanNumber,
              role: "PARENT",
            },
          });

          if (newAuth?.user) {
            await admin.from("profiles").upsert({
              id: newAuth.user.id,
              email: resolvedEmail,
              full_name: `${parent.first_name} ${parent.last_name || ""}`.trim(),
              phone: cleanNumber,
              role: "PARENT",
              is_active: true,
              email_verified: true,
            });
            await admin.from("parents").update({ user_id: newAuth.user.id }).eq("id", parent.id);
          }
        }
      } else {
        resolvedEmail = `${cleanNumber}@parent.hostelconnect.in`;
      }
    }

    // 2. Perform Supabase Sign In with resolved credentials
    const supabase = await createClient();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    // Fallback if client-side cookie session needs direct admin verification
    if (error) {
      console.error("[Login Auth Error]:", error.message);
      return NextResponse.json({
        success: false,
        error: { message: "Invalid mobile number, email, or password. Please verify your login credentials." },
      }, { status: 401 });
    }

    // 3. Fetch user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "PARENT";

    return NextResponse.json({
      success: true,
      user: data.user,
      role,
      session: data.session,
    });
  } catch (err) {
    console.error("[Login Exception]:", err);
    return NextResponse.json({
      success: false,
      error: { message: err.message || "Server error during authentication" },
    }, { status: 500 });
  }
}
