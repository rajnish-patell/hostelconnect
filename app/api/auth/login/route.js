import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter, getClientIp } from "@/lib/security/rate-limit.mjs";

const loginRateLimiter = createRateLimiter({
  name: "auth-login",
  limit: 10,
  windowMs: 15 * 60 * 1000,
});

export async function POST(request) {
  try {
    const rateLimit = loginRateLimiter(getClientIp(request));
    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: { message: "Too many login attempts. Please try again later." },
      }, {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }

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

    // A mobile number is only a login identifier. Never create an account or
    // change a password during sign-in: either action would let an attacker
    // take over an account by knowing a phone number.
    if (cleanNumber.length >= 10 && !resolvedEmail.includes("@")) {
      resolvedEmail = `${cleanNumber}@parent.hostelconnect.in`;
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
      const cleanPhone = (data.user.user_metadata?.phone || "").replace(/\D/g, "");
      let orConds = [`user_id.eq.${data.user.id}`];
      if (data.user.email) orConds.push(`email.eq.${data.user.email}`);
      if (cleanPhone) orConds.push(`phone.eq.${cleanPhone}`);

      let { data: parentRecord } = await admin
        .from("parents")
        .select("id, is_active, user_id")
        .or(orConds.join(","))
        .limit(1)
        .maybeSingle();

      // If parent record exists but user_id is not yet linked, link it now!
      if (parentRecord && parentRecord.user_id !== data.user.id) {
        await admin
          .from("parents")
          .update({ user_id: data.user.id, email: data.user.email || parentRecord.email })
          .eq("id", parentRecord.id);
      }

      if (parentRecord && parentRecord.is_active === false) {
        await supabase.auth.signOut();
        return NextResponse.json({
          success: false,
          error: { message: "This parent account has been deactivated. Please contact the hostel administrator." },
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
