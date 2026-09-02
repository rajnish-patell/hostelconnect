import { NextResponse } from "next/server";
import { endCall } from "@/lib/services/call.service";
import { requireCallAccess } from "@/lib/auth/rbac";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { user } = await requireCallAccess(id);
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const endReason = body.endReason || "NORMAL_HANGUP";
    const updated = await endCall(id, user.id, endReason);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: err.code || "END_CALL_FAILED", message: err.message },
    }, { status: err.status || 500 });
  }
}
