import { NextResponse } from "next/server";
import { getCurrentUser, getUserProfile } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";

// Helper to resolve the authenticated user's hostel ID
async function resolveUserHostelId(user, admin) {
  if (!user) return null;

  // 1. Check hostel_members table
  const { data: member } = await admin
    .from("hostel_members")
    .select("hostel_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (member?.hostel_id) return member.hostel_id;

  // 2. Check hostels metadata by admin email
  if (user.email) {
    const { data: hostel } = await admin
      .from("hostels")
      .select("id")
      .eq("metadata->>admin_email", user.email)
      .limit(1)
      .single();

    if (hostel?.id) return hostel.id;
  }

  // 3. Check profiles table
  const { data: profile } = await admin
    .from("profiles")
    .select("hostel_id")
    .eq("id", user.id)
    .single();

  if (profile?.hostel_id) return profile.hostel_id;

  return null;
}

export async function GET(request) {
  try {
    const admin = createAdminClient();
    const user = await getCurrentUser();
    const profile = user ? await getUserProfile(user.id) : null;
    const { searchParams } = new URL(request.url);

    let hostelId = searchParams.get("hostelId");
    const search = searchParams.get("search");

    // Multi-tenant isolation: If user is HOSTEL_ADMIN or WARDEN, enforce their school's hostel_id
    if (!hostelId && user && profile?.role !== "SUPER_ADMIN") {
      hostelId = await resolveUserHostelId(user, admin);
    }

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

    // Strict multi-tenant school isolation
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

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: err.message } }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const admin = createAdminClient();
    const user = await getCurrentUser();
    const profile = user ? await getUserProfile(user.id) : null;

    let {
      hostelId,
      firstName,
      lastName,
      admissionNumber,
      classGrade,
      section,
      parentMobile,
      parentName,
      parentPassword,
      relationship,
      kioskPin,
      maxCallDurationMinutes,
      unlimitedCalls,
    } = body;

    if (!firstName || !admissionNumber) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "First name and Student ID (Admission Number) are required." },
      }, { status: 400 });
    }

    // 1. Resolve exact target School Hostel ID
    if (!hostelId && user) {
      hostelId = await resolveUserHostelId(user, admin);
    }

    if (!hostelId) {
      const { data: firstHostel } = await admin
        .from("hostels")
        .select("id")
        .limit(1)
        .single();
      hostelId = firstHostel?.id;
    }

    if (!hostelId) {
      return NextResponse.json({
        success: false,
        error: { code: "NO_HOSTEL", message: "No valid hostel campus found to associate student with." },
      }, { status: 400 });
    }

    // 2. Create or update Student record strictly for this school
    const { data: student, error: studentErr } = await admin
      .from("students")
      .upsert({
        hostel_id: hostelId,
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
          kiosk_pin: kioskPin?.trim() || "1234",
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
      const generatedEmail = `${cleanPhone}@parent.hostelconnect.in`;
      const plainPassword = parentPassword || "Parent@1234";

      // Check or create Supabase Auth User for Parent
      let authUserId = null;
      const { data: existingUser } = await admin.auth.admin.listUsers();
      const matched = existingUser?.users?.find(u => u.email === generatedEmail);

      if (matched) {
        authUserId = matched.id;
      } else {
        const { data: newUser, error: createAuthErr } = await admin.auth.admin.createUser({
          email: generatedEmail,
          password: plainPassword,
          email_confirm: true,
          user_metadata: {
            full_name: parentName || `${firstName}'s Parent`,
            role: "PARENT",
            phone: cleanPhone,
          },
        });
        if (!createAuthErr && newUser?.user) {
          authUserId = newUser.user.id;
        }
      }

      // Upsert Parents Profile
      const { data: parentRecord } = await admin
        .from("parents")
        .upsert({
          user_id: authUserId,
          first_name: parentName ? parentName.split(" ")[0] : `${firstName}'s`,
          last_name: parentName && parentName.split(" ").length > 1 ? parentName.split(" ").slice(1).join(" ") : "Parent",
          phone: cleanPhone,
          email: generatedEmail,
          is_active: true,
          metadata: {
            initial_password: plainPassword,
          },
        }, { onConflict: "phone" })
        .select()
        .single();

      // Link Parent to Student
      if (parentRecord) {
        await admin
          .from("student_guardians")
          .upsert({
            student_id: student.id,
            parent_id: parentRecord.id,
            relationship: relationship || "GUARDIAN",
            verification_status: "VERIFIED",
            can_video_call: true,
            is_emergency_contact: true,
          }, { onConflict: "student_id,parent_id" });
      }
    }

    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, { status: 500 });
  }
}
