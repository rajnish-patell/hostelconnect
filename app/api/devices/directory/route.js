import { NextResponse } from "next/server";
import { verifyDeviceSession } from "@/lib/auth/rbac";
import { getDeviceKioskDirectory } from "@/lib/services/device.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const hostelIdParam = searchParams.get("hostelId");

    // 1. Fetch all active hostels (tenants)
    const { data: allHostels } = await admin
      .from("hostels")
      .select("id, name, status")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true });

    const tenants = (allHostels || []).map((h) => ({ id: h.id, name: h.name }));

    // 2. Check for device session token if present
    const authHeader = request.headers.get("authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");
    if (sessionToken && sessionToken.startsWith("dev_")) {
      const session = await verifyDeviceSession(sessionToken);
      if (session) {
        const directory = await getDeviceKioskDirectory(session.device_id);
        return NextResponse.json({
          success: true,
          tenants,
          device: {
            id: session.device.id,
            name: session.device.name,
            hostelId: session.device.hostel_id,
          },
          data: directory,
        });
      }
    }

    // 3. Multi-tenant directory: fetch students for the specified hostelId (or all/default)
    const activeHostelId =
      hostelIdParam && hostelIdParam !== "all"
        ? hostelIdParam
        : tenants[0]?.id || null;

    let query = admin
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
        hostel:hostels(id, name),
        guardians:student_guardians (
          id,
          relationship,
          can_video_call,
          verification_status,
          is_primary,
          parent:parents (
            id,
            first_name,
            last_name,
            phone,
            email,
            photo_url
          )
        )
      `)
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    if (activeHostelId) {
      query = query.eq("hostel_id", activeHostelId);
    }

    const { data: students, error: studErr } = await query;

    if (studErr) {
      console.error("[Hostel Kiosk Directory Fetch Error]:", studErr);
    }

    const activeHostelName = tenants.find((t) => t.id === activeHostelId)?.name || "Hostel Kiosk";

    return NextResponse.json({
      success: true,
      tenants,
      currentHostelId: activeHostelId,
      device: {
        id: "kiosk-open-session",
        name: `${activeHostelName} Terminal`,
        hostelId: activeHostelId,
      },
      data: students || [],
    });
  } catch (err) {
    console.error("[Kiosk Directory Route Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "DIRECTORY_FETCH_FAILED", message: err.message },
    }, { status: 500 });
  }
}
