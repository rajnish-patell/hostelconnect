import { NextResponse } from "next/server";
import { verifyDeviceSession } from "@/lib/auth/rbac";
import { getDeviceKioskDirectory } from "@/lib/services/device.service";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");
    // 1. If valid device session token provided, load specific device directory
    if (sessionToken && sessionToken.startsWith("dev_")) {
      const session = await verifyDeviceSession(sessionToken);
      if (session) {
        const directory = await getDeviceKioskDirectory(session.device_id);
        return NextResponse.json({
          success: true,
          device: {
            id: session.device.id,
            name: session.device.name,
            hostelId: session.device.hostel_id,
          },
          data: directory,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: { code: "DEVICE_AUTH_REQUIRED", message: "Activate this kiosk before viewing the student directory." },
    }, { status: 401 });
  } catch (err) {
    console.error("[Kiosk Directory Route Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "DIRECTORY_FETCH_FAILED", message: err.message },
    }, { status: 500 });
  }
}
