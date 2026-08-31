import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);

    const hostelId = searchParams.get("hostelId");
    const search = searchParams.get("search");

    let query = admin
      .from("students")
      .select(`
        *,
        room:rooms(id, name),
        guardians:student_guardians(
          id,
          relationship,
          verification_status,
          can_video_call,
          parent:parents(
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            is_active,
            metadata
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (hostelId) {
      query = query.eq("hostel_id", hostelId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,admission_number.ilike.%${search}%`);
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
    const admin = createAdminClient();

    const {
      hostelId,
      firstName,
      lastName,
      admissionNumber,
      classGrade,
      section,
      parentMobile,
      parentName,
      parentEmail,
      parentPassword,
      relationship,
      maxCallDurationMinutes,
      unlimitedCalls,
    } = body;

    if (!firstName || !admissionNumber) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "First name and Student ID (Admission Number) are required." },
      }, { status: 400 });
    }

    // 1. Resolve a valid Hostel ID (Avoid Foreign Key Violations)
    let validHostelId = hostelId;
    if (validHostelId) {
      const { data: hCheck } = await admin
        .from("hostels")
        .select("id")
        .eq("id", validHostelId)
        .single();
      if (!hCheck) validHostelId = null;
    }

    if (!validHostelId) {
      const { data: firstHostel } = await admin
        .from("hostels")
        .select("id")
        .limit(1)
        .single();

      if (firstHostel) {
        validHostelId = firstHostel.id;
      } else {
        let { data: org } = await admin
          .from("organizations")
          .select("id")
          .limit(1)
          .single();

        if (!org) {
          const { data: newOrg } = await admin
            .from("organizations")
            .insert({
              name: "Greenwood Group of Institutions",
              slug: `greenwood-${Date.now()}`,
              is_active: true,
            })
            .select()
            .single();
          org = newOrg;
        }

        const { data: newHostel } = await admin
          .from("hostels")
          .insert({
            organization_id: org?.id,
            name: "Greenwood Residential Campus",
            code: "GWD-01",
            status: "ACTIVE",
            max_call_duration_minutes: 15,
            address: { city: "Dehradun" },
            metadata: {
              city: "Dehradun",
              call_rate_per_minute: 2,
              unlimited_calls_enabled: false,
            },
          })
          .select()
          .single();

        validHostelId = newHostel?.id;
      }
    }

    if (!validHostelId) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_HOSTEL", message: "No valid hostel campus found to associate student with." },
      }, { status: 400 });
    }

    // 2. Create or update Student record
    const { data: student, error: studentErr } = await admin
      .from("students")
      .upsert({
        hostel_id: validHostelId,
        first_name: firstName.trim(),
        last_name: lastName ? lastName.trim() : null,
        admission_number: admissionNumber.trim().toUpperCase(),
        class_grade: classGrade ? classGrade.trim() : null,
        section: section ? section.trim().toUpperCase() : null,
        is_active: true,
        metadata: {
          balance_paise: 5000, // ₹50 starter calling balance
          max_call_duration_minutes: Number(maxCallDurationMinutes) || 15,
          unlimited_calls: Boolean(unlimitedCalls),
          kiosk_pin: body.kioskPin?.trim() || "1234",
        },
      }, { onConflict: "hostel_id,admission_number" })
      .select()
      .single();

    if (studentErr) {
      return NextResponse.json({ success: false, error: { code: "STUDENT_CREATE_FAILED", message: studentErr.message } }, { status: 400 });
    }

    // 3. Auto-create Parent Auth Account + Parent Profile + Link
    if (parentMobile && student) {
      const cleanPhone = parentMobile.replace(/\D/g, "");
      const generatedEmail = (parentEmail && parentEmail.trim()) || `${cleanPhone}@parent.hostelconnect.in`;
      const generatedPassword = parentPassword || "Parent@1234";

      // 3a. Create or find Auth User for Parent
      let authUserId = null;
      try {
        const { data: userRecord, error: uErr } = await admin.auth.admin.createUser({
          email: generatedEmail,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            full_name: parentName || `${firstName}'s Parent`,
            phone: cleanPhone,
            role: "PARENT",
          },
        });

        if (userRecord?.user) {
          authUserId = userRecord.user.id;
          await admin.from("profiles").upsert({
            id: authUserId,
            email: generatedEmail,
            full_name: parentName || `${firstName}'s Parent`,
            phone: cleanPhone,
            role: "PARENT",
            is_active: true,
            email_verified: true,
          });
        }
      } catch (authErr) {
        console.log("Parent Auth creation info:", authErr.message);
      }

      // 3b. Create or Update Parents Table Record
      let { data: parent } = await admin
        .from("parents")
        .select("id")
        .eq("phone", cleanPhone)
        .single();

      if (!parent) {
        const nameParts = (parentName || `${firstName}'s Parent`).split(" ");
        const { data: newParent } = await admin
          .from("parents")
          .insert({
            user_id: authUserId,
            first_name: nameParts[0] || "Guardian",
            last_name: nameParts.slice(1).join(" ") || null,
            phone: cleanPhone,
            email: generatedEmail,
            is_active: true,
            metadata: {
              initial_password: generatedPassword,
              relationship: relationship || "FATHER",
            },
          })
          .select()
          .single();
        parent = newParent;
      } else if (authUserId) {
        await admin.from("parents").update({
          user_id: authUserId,
          metadata: { initial_password: generatedPassword },
        }).eq("id", parent.id);
      }

      // 3c. Link Student ↔️ Parent
      if (parent) {
        await admin.from("student_guardians").upsert({
          student_id: student.id,
          parent_id: parent.id,
          relationship: relationship || "FATHER",
          is_primary: true,
          verification_status: "VERIFIED",
          can_video_call: true,
        }, { onConflict: "student_id,parent_id" });
      }
    }

    return NextResponse.json({
      success: true,
      data: student,
      credentials: {
        phone: parentMobile,
        password: parentPassword || "Parent@1234",
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "ERROR", message: err.message } }, { status: err.status || 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const admin = createAdminClient();

    const { id, isActive, metadata, firstName, lastName, classGrade, section } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: { message: "Student ID is required." } }, { status: 400 });
    }

    const updates = {};
    if (typeof isActive === "boolean") updates.is_active = isActive;
    if (metadata) updates.metadata = metadata;
    if (firstName) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (classGrade !== undefined) updates.class_grade = classGrade;
    if (section !== undefined) updates.section = section;

    const { data: updated, error } = await admin
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}
