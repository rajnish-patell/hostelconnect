import { NextResponse } from "next/server";
import { startCall } from "@/lib/services/call.service";
import { getCurrentUser } from "@/lib/auth/rbac";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const updated = await startCall(id, user?.id || null);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: err.code || "START_CALL_FAILED", message: err.message },
    }, { status: err.status || 500 });
  }
}
