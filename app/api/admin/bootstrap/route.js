import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent, logSecurityEvent } from "@/lib/services/audit.service";

export async function POST(request) {
  try {
    const body = await request.json();
    const { secret, email } = body;

    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret || secret !== bootstrapSecret) {
      await logSecurityEvent({
        eventType: "UNAUTHORIZED_BOOTSTRAP_ATTEMPT",
        severity: "CRITICAL",
        description: `Failed super admin bootstrap attempt with email: ${email || "unspecified"}`,
      });
      return NextResponse.json({ success: false, error: "Invalid bootstrap secret" }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "Target email required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find profile by email
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, email, role")
      .eq("email", email)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        success: false,
        error: "User with this email not found in profiles. Please sign up first, then bootstrap.",
      }, { status: 404 });
    }

    // Elevate role to SUPER_ADMIN
    await admin
      .from("profiles")
      .update({ role: "SUPER_ADMIN" })
      .eq("id", profile.id);

    await logAuditEvent({
      actorId: profile.id,
      action: "SUPER_ADMIN_BOOTSTRAPPED",
      resourceType: "profile",
      resourceId: profile.id,
      description: `Elevated ${email} to SUPER_ADMIN role via bootstrap secret.`,
    });

    return NextResponse.json({
      success: true,
      message: `User ${email} has been successfully elevated to SUPER_ADMIN.`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
