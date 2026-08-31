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
        .eq("is_active", true)
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
          await admin.auth.admin.updateUserById(existingUser.id, {
            password: password,
            email_confirm: true,
          });

          if (!parent.user_id) {
            await admin.from("parents").update({ user_id: existingUser.id }).eq("id", parent.id);
          }
        } else {
          // Auto-create Auth user for this parent
          const { data: newAuth } = await admin.auth.admin.createUser({
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
        // If parent does not exist or was deleted with the school
        return NextResponse.json({
          success: false,
          error: { message: "No active parent account found. If your school was removed, your account is deactivated." },
        }, { status: 401 });
      }
    }

    // 2. Perform Supabase Sign In with resolved credentials
    const supabase = await createClient();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (error) {
      console.error("[Login Auth Error]:", error.message);
      return NextResponse.json({
        success: false,
        error: { message: "Invalid mobile number, email, or password. Please verify your login credentials." },
      }, { status: 401 });
    }

    // 3. Fetch user profile and check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "PARENT";

    // 4. Strict Multi-Tenant & Active School Status Check
    if (role === "PARENT") {
      const { data: parentRecord } = await admin
        .from("parents")
        .select("id, is_active")
        .eq("user_id", data.user.id)
        .single();

      if (!parentRecord || !parentRecord.is_active) {
        await supabase.auth.signOut();
        return NextResponse.json({
          success: false,
          error: { message: "This parent account has been deactivated because the school campus was removed." },
        }, { status: 403 });
      }

      // Check if this parent has at least one active student linked to an active school
      const { data: guardians } = await admin
        .from("student_guardians")
        .select("id, student:students(id, is_active, hostel:hostels(id, status))")
        .eq("parent_id", parentRecord.id);

      const hasActiveSchool = guardians?.some(
        g => g.student && g.student.is_active && g.student.hostel && g.student.hostel.status === "ACTIVE"
      );

      if (!hasActiveSchool) {
        await supabase.auth.signOut();
        return NextResponse.json({
          success: false,
          error: { message: "Your registered school campus is no longer active or has been removed." },
        }, { status: 403 });
      }
    } else if (role === "HOSTEL_ADMIN" || role === "WARDEN" || role === "STAFF") {
      // Check if their hostel still exists and is ACTIVE
      const { data: member } = await admin
        .from("hostel_members")
        .select("id, is_active, hostel:hostels(id, status)")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .single();

      const { data: adminHostel } = await admin
        .from("hostels")
        .select("id, status")
        .eq("metadata->>admin_email", data.user.email)
        .single();

      const isActiveCampus =
        (member?.hostel && member.hostel.status === "ACTIVE") ||
        (adminHostel && adminHostel.status === "ACTIVE");

      if (!isActiveCampus) {
        await supabase.auth.signOut();
        return NextResponse.json({
          success: false,
          error: { message: "This school campus has been deleted or deactivated." },
        }, { status: 403 });
      }
    }

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
