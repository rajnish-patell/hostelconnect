import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Auth guard: Must be authenticated. Video call page is protected.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required to access call session" },
      }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: session, error } = await admin
      .from("call_sessions")
      .select("*, student:students(*), parent:parents(*), hostel:hostels(*)")
      .eq("id", id)
      .single();

    if (error || !session) {
      return NextResponse.json({
        success: false,
        error: { code: "CALL_NOT_FOUND", message: "Call session not found" },
      }, { status: 404 });
    }

    // Authorization check: Only the student, parent, or hostel staff may view this session
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "PARENT";

    const isParentOfCall = session.parent?.user_id === user.id;
    const isStudentOfCall = session.student?.user_id === user.id;
    const isAdminOrStaff = ["SUPER_ADMIN", "HOSTEL_ADMIN", "WARDEN", "STAFF"].includes(userRole);

    if (!isParentOfCall && !isStudentOfCall && !isAdminOrStaff) {
      return NextResponse.json({
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have permission to view this call session" },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    }, { status: 500 });
  }
}
