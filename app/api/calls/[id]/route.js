import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, verifyDeviceSession } from "@/lib/auth/rbac";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // Verify access via either user session or device session
    const user = await getCurrentUser();
    let isAuthorized = !!user;

    if (!isAuthorized) {
      const authHeader = request.headers.get("authorization");
      const sessionToken = authHeader?.replace("Bearer ", "");
      const deviceSession = await verifyDeviceSession(sessionToken);
      if (deviceSession) isAuthorized = true;
    }

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
