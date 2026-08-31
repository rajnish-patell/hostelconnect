import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { parentSchema, studentGuardianLinkSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendParentLinkedEmail } from "@/lib/email/resend";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const phoneParam = url.searchParams.get("phone");
    const admin = createAdminClient();

    // If query by phone (public helper for mobile login resolution)
    if (phoneParam) {
      const cleanPhone = phoneParam.replace(/\D/g, "");
      const { data: parent } = await admin
        .from("parents")
        .select("id, first_name, last_name, email, phone")
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}%`)
        .limit(1)
        .maybeSingle();

      return NextResponse.json({ success: true, data: parent });
    }

    const { user, profile } = await requireAuth();
    const supabase = await createClient();

    // Look up parent record for this user or by email/phone
    const cleanPhone = (user.user_metadata?.phone || profile?.phone || "").replace(/\D/g, "");
    let orConditions = [`user_id.eq.${user.id}`];
    if (user.email) orConditions.push(`email.eq.${user.email}`);
    if (cleanPhone) orConditions.push(`phone.eq.${cleanPhone}`);

    const { data: parent } = await admin
      .from("parents")
      .select(`
        *,
        student_guardians(
          id,
          relationship,
          verification_status,
          can_video_call,
          student:students(
            id,
            first_name,
            last_name,
            admission_number,
            class_grade,
            section,
            photo_url,
            is_active,
            metadata,
            hostel:hostels(id, name, timezone, max_call_duration_minutes)
          )
        )
      `)
      .or(orConditions.join(","))
      .limit(1)
      .maybeSingle();

    if (parent) {
      return NextResponse.json({ success: true, data: parent });
    }

    // Admin/Staff view
    const { data: parents, error } = await supabase
      .from("parents")
      .select("*, student_guardians(*, student:students(first_name, last_name, admission_number))")
      .order("first_name", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: parents });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: err.message } }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const admin = createAdminClient();

    // Check if this is a linking action or creation
    if (body.action === "link") {
      const parseResult = studentGuardianLinkSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
        }, { status: 400 });
      }

      const { studentId, parentId, relationship, isPrimary, canVideoCall, notes } = parseResult.data;

      const { data: link, error: linkErr } = await admin
        .from("student_guardians")
        .upsert({
          student_id: studentId,
          parent_id: parentId,
          relationship,
          is_primary: isPrimary,
          can_video_call: canVideoCall,
          verification_status: "VERIFIED",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes,
        })
        .select("*, student:students(*, hostel:hostels(*)), parent:parents(*)")
        .single();

      if (linkErr) {
        return NextResponse.json({ success: false, error: { code: "LINK_FAILED", message: linkErr.message } }, { status: 400 });
      }

      if (link.parent?.email) {
        try {
          await sendParentLinkedEmail({
            to: link.parent.email,
            parentName: `${link.parent.first_name} ${link.parent.last_name || ""}`.trim(),
            studentName: `${link.student.first_name} ${link.student.last_name || ""}`.trim(),
            hostelName: link.student.hostel.name,
          });
        } catch {}
      }

      await logAuditEvent({
        actorId: user.id,
        action: "PARENT_LINKED",
        resourceType: "student_guardian",
        resourceId: link.id,
        description: `Linked parent ${link.parent.first_name} to student ${link.student.first_name} (${relationship})`,
        hostelId: link.student.hostel_id,
      });

      return NextResponse.json({ success: true, data: link });
    }

    // Direct parent creation
    const parseResult = parentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error.errors[0]?.message },
      }, { status: 400 });
    }

    const { firstName, lastName, email, phone, alternatePhone } = parseResult.data;

    const { data: parent, error: createErr } = await admin
      .from("parents")
      .insert({
        first_name: firstName,
        last_name: lastName || null,
        email,
        phone,
        alternate_phone: alternatePhone || null,
      })
      .select()
      .single();

    if (createErr) {
      return NextResponse.json({ success: false, error: { code: "PARENT_CREATE_FAILED", message: createErr.message } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: parent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "ERROR", message: err.message } }, { status: err.status || 500 });
  }
}
