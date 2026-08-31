import { NextResponse } from "next/server";
import { getCurrentUser, getUserProfile, verifyDeviceSession } from "@/lib/auth/rbac";
import { createCallSession } from "@/lib/services/call.service";
import { initiateCallSchema } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("call_sessions")
      .select("*, student:students(id, first_name, last_name, admission_number), parent:parents(id, first_name, last_name, phone), hostel:hostels(id, name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profile?.role === "PARENT") {
      const { data: parent } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (parent) {
        query = query.eq("parent_id", parent.id);
      } else {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit } });
      }
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = initiateCallSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    let { studentId, parentId, deviceId, isEmergency, notes } = parseResult.data;
    const admin = createAdminClient();

    // Check auth: Can be initiated by authenticated user OR kiosk
    let initiatedByUserId = null;
    const user = await getCurrentUser();

    if (user) {
      initiatedByUserId = user.id;
    }

    // Auto-resolve parentId if missing or invalid UUID
    const isUuid = (val) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (!isUuid(parentId)) {
      if (user) {
        const { data: userParent } = await admin
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (userParent) parentId = userParent.id;
      }

      if (!isUuid(parentId)) {
        const { data: guardians } = await admin
          .from("student_guardians")
          .select("parent_id")
          .eq("student_id", studentId)
          .limit(1);
        if (guardians && guardians.length > 0) {
          parentId = guardians[0].parent_id;
        }
      }
    }

    // Sanitize deviceId for PostgreSQL UUID constraint
    const sanitizedDeviceId = isUuid(deviceId) ? deviceId : null;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    const session = await createCallSession({
      studentId,
      parentId,
      deviceId: sanitizedDeviceId,
      initiatedByUserId,
      isEmergency,
      notes,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: session,
    }, { status: 201 });
  } catch (err) {
    console.error("[Create Call Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: err.code || "CALL_INITIATION_FAILED", message: err.message },
    }, { status: err.status || 500 });
  }
}
