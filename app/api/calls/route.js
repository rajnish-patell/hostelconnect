import { NextResponse } from "next/server";
import { getCurrentUser, getUserProfile, requireAuth, verifyParentStudentRelation } from "@/lib/auth/rbac";
import { createCallSession } from "@/lib/services/call.service";
import { initiateCallSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = admin
      .from("call_sessions")
      .select("*, student:students(id, first_name, last_name, admission_number), parent:parents(id, first_name, last_name, phone), hostel:hostels(id, name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profile?.role === "PARENT") {
      const cleanPhone = (user.user_metadata?.phone || profile?.phone || "").replace(/\D/g, "");
      let orConds = [`user_id.eq.${user.id}`];
      if (user.email) orConds.push(`email.eq.${user.email}`);
      if (cleanPhone) orConds.push(`phone.eq.${cleanPhone}`);

      const { data: parentRecords } = await admin
        .from("parents")
        .select("id, phone, user_id")
        .or(orConds.join(","));

      let parentIds = (parentRecords || []).map((p) => p.id);

      // Auto-link user_id if needed
      for (const p of (parentRecords || [])) {
        if (p.user_id !== user.id) {
          await admin.from("parents").update({ user_id: user.id }).eq("id", p.id);
        }
      }

      // Also find all students linked to this parent
      let studentIds = [];
      if (parentIds.length > 0) {
        const { data: guardians } = await admin
          .from("student_guardians")
          .select("student_id")
          .in("parent_id", parentIds);

        studentIds = (guardians || []).map((g) => g.student_id);
      }

      if (parentIds.length > 0 || studentIds.length > 0) {
        let orConditions = [];
        if (parentIds.length > 0) orConditions.push(`parent_id.in.(${parentIds.join(",")})`);
        if (studentIds.length > 0) orConditions.push(`student_id.in.(${studentIds.join(",")})`);

        query = query.or(orConditions.join(","));
      } else {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit } });
      }
    } else if (["HOSTEL_ADMIN", "WARDEN", "STAFF"].includes(profile?.role)) {
      // Find hostel of this admin
      const { data: member } = await admin
        .from("hostel_members")
        .select("hostel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (member?.hostel_id) {
        query = query.eq("hostel_id", member.hostel_id);
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
      data: data || [],
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

    const { user, profile } = await requireAuth();
    const initiatedByUserId = user.id;

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
        const { data: guardian } = await admin
          .from("student_guardians")
          .select("parent_id")
          .eq("student_id", studentId)
          .eq("can_video_call", true)
          .limit(1)
          .single();
        if (guardian?.parent_id) parentId = guardian.parent_id;
      }
    }

    if (!parentId) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_PARENT", message: "No registered parent found for this student." },
      }, { status: 400 });
    }

    if (profile.role === "PARENT" && !(await verifyParentStudentRelation(studentId, user.id))) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "You can only start calls for your linked students." } }, { status: 403 });
    }

    const session = await createCallSession({
      studentId,
      parentId,
      deviceId: deviceId || null,
      isEmergency: Boolean(isEmergency),
      notes: notes || null,
      initiatedByUserId,
    });

    return NextResponse.json({
      success: true,
      data: session,
    }, { status: 201 });
  } catch (err) {
    console.error("[Create Call Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: err.code || "CALL_CREATION_FAILED", message: err.message },
    }, { status: err.status || 500 });
  }
}
