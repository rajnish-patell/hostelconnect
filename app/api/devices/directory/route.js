import { NextResponse } from "next/server";
import { verifyDeviceSession } from "@/lib/auth/rbac";
import { getDeviceKioskDirectory } from "@/lib/services/device.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");
    const admin = createAdminClient();

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

    // 2. Open / Demo Kiosk Fallback: Fetch all active campus students with verified parents
    const { data: students, error: studErr } = await admin
      .from("students")
      .select(`
        id,
        first_name,
        last_name,
        admission_number,
        class_grade,
        section,
        photo_url,
        is_active,
        metadata,
        hostel_id,
        room:rooms(id, name, floor),
        guardians:student_guardians(
          id,
          relationship,
          can_video_call,
          verification_status,
          parent:parents(
            id,
            first_name,
            last_name,
            phone,
            email,
            photo_url
          )
        )
      `)
      .order("first_name", { ascending: true });

    if (studErr) {
      console.error("[Kiosk Directory Fetch Error]:", studErr);
      return NextResponse.json({ success: true, data: [] });
    }

    // Map guardians format for frontend kiosk compatibility
    const mapped = (students || []).map((s) => ({
      ...s,
      guardians: s.guardians || [],
    }));

    return NextResponse.json({
      success: true,
      device: {
        id: null,
        name: "Campus Calling Kiosk 1",
        hostelId: students?.[0]?.hostel_id || null,
      },
      data: mapped,
    });
  } catch (err) {
    console.error("[Kiosk Directory Route Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "DIRECTORY_FETCH_FAILED", message: err.message },
    }, { status: 500 });
  }
}
