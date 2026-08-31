import { NextResponse } from "next/server";
import { requireAuth, requireHostelAccess } from "@/lib/auth/rbac";
import { registerDevice } from "@/lib/services/device.service";
import { deviceRegistrationSchema } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  try {
    const { user, profile } = await requireAuth();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostelId");

    let query = supabase
      .from("devices")
      .select("*, hostel:hostels(name), device_activation_codes(code, expires_at, used_at)")
      .order("created_at", { ascending: false });

    if (hostelId) {
      query = query.eq("hostel_id", hostelId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: err.message } }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = deviceRegistrationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { hostelId, name, description, deviceType } = parseResult.data;
    const { user } = await requireHostelAccess(hostelId, ["HOSTEL_ADMIN"]);

    const result = await registerDevice({
      hostelId,
      name,
      description,
      deviceType,
      createdByUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: "DEVICE_REGISTRATION_FAILED", message: err.message },
    }, { status: err.status || 500 });
  }
}
