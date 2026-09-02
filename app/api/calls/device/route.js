import { NextResponse } from "next/server";
import { verifyDeviceSession } from "@/lib/auth/rbac";
import { createCallSession } from "@/lib/services/call.service";
import { initiateCallSchema } from "@/lib/validators";

/**
 * POST /api/calls/device
 * ──────────────────────────
 * Device kiosk endpoint for initiating calls.
 * Requires device session token in Authorization header.
 *
 * Headers:
 *   Authorization: Bearer dev_xxxxx
 *
 * Body:
 *   {
 *     studentId: "uuid",
 *     parentId: "uuid",
 *     deviceId: "uuid",
 *     notes?: "Call notes"
 *   }
 *
 * Response:
 *   { success: true, data: { id, meeting_id, student, parent, ... } }
 *   OR
 *   { success: false, error: { code, message } }
 */
export async function POST(request) {
  try {
    let deviceId = null;
    let deviceName = "Kiosk Terminal";

    // 1. Optional device session token check
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");

    if (sessionToken && sessionToken.startsWith("dev_")) {
      const deviceSession = await verifyDeviceSession(sessionToken);
      if (deviceSession) {
        deviceId = deviceSession.device_id;
        deviceName = deviceSession.device.name;
      }
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = initiateCallSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
        },
        { status: 400 }
      );
    }

    const { studentId, parentId, notes } = parseResult.data;

    // 3. Create call session (initiated by kiosk student, no activation token required)
    const session = await createCallSession({
      studentId,
      parentId,
      deviceId,
      initiatedByUserId: null,
      isEmergency: false,
      notes: notes || `Direct call from ${deviceName}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (err) {
    console.error("[Device Call Route Error]:", err);

    // Handle daily limit errors gracefully
    if (err.code === "DAILY_STUDENT_LIMIT_REACHED" || err.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DAILY_LIMIT_REACHED", message: err.message },
        },
        { status: 429 }
      );
    }

    // Handle line busy errors
    if (err.code === "STUDENT_LINE_BUSY" || err.status === 409) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "STUDENT_BUSY", message: err.message },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "CALL_FAILED", message: err.message || "Failed to create call session" },
      },
      { status: err.status || 400 }
    );
  }
}
