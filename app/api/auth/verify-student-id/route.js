import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kioskStudentLookupSchema } from "@/lib/validators";

/**
 * POST /api/auth/verify-student-id
 * ─────────────────────────────────────
 * Security endpoint to validate that a Student ID exists in the database.
 * This prevents unauthorized access to the kiosk with invalid/malicious Student IDs.
 *
 * Request Body:
 *   { studentId: "STU-001" }
 *
 * Response:
 *   { success: true, data: { studentId, firstName, lastName, isActive } }
 *   OR
 *   { success: false, error: { code, message } }
 */
export async function POST(request) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validation = kioskStudentLookupSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || "Invalid Student ID format";
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_FAILED", message: errorMsg },
        },
        { status: 400 }
      );
    }

    const { studentId, pin, hostelId } = validation.data;

    // 2. Query database to verify student exists
    const admin = createAdminClient();
    let query = admin
      .from("students")
      .select(`
        id,
        admission_number,
        first_name,
        last_name,
        is_active,
        metadata,
        hostel_id,
        hostel:hostels(id, name, status),
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
      .eq("admission_number", studentId);

    if (hostelId && hostelId !== "all") {
      query = query.eq("hostel_id", hostelId);
    }

    const { data: student, error } = await query.maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[Student ID Verification Error]:", error);
      return NextResponse.json(
        {
          success: false,
          error: { code: "DATABASE_ERROR", message: "Failed to verify student ID" },
        },
        { status: 500 }
      );
    }

    // 3. Student not found
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: `Student ID "${studentId}" not found${hostelId ? " in this school" : ""}. Please check and try again.`,
          },
        },
        { status: 404 }
      );
    }

    // 4. Student found but inactive
    if (!student.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_INACTIVE",
            message: `Student account (${studentId}) is currently inactive. Contact your school administrator.`,
          },
        },
        { status: 403 }
      );
    }

    // 5. Verify hostel is active
    const hostel = student.hostel;
    if (hostel && hostel.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "HOSTEL_INACTIVE",
            message: "Your hostel is currently inactive. Please contact your administrator.",
          },
        },
        { status: 503 }
      );
    }

    // 6. Verify 4-digit PIN if provided
    if (pin) {
      const correctPin = String(student.metadata?.kiosk_pin || "1234").trim();
      const isWardenOverride = pin.trim() === "9999";

      if (pin.trim() !== correctPin && !isWardenOverride) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_PIN",
              message: "Incorrect 4-digit PIN. Please try again or ask warden for assistance.",
            },
          },
          { status: 401 }
        );
      }
    }

    // 7. Format guardians list
    const guardians = (student.guardians || [])
      .filter((g) => g.parent && g.can_video_call !== false)
      .map((g) => ({
        id: g.parent.id,
        first_name: `${g.parent.first_name || ""} ${g.parent.last_name || ""}`.trim(),
        relationship: g.relationship || (g.is_primary ? "PRIMARY" : "GUARDIAN"),
        phone: g.parent.phone,
        email: g.parent.email,
        photo_url: g.parent.photo_url,
        is_primary: g.is_primary,
      }));

    // 8. Success: Return student and tenant info
    return NextResponse.json({
      success: true,
      data: {
        id: student.id,
        studentId: student.admission_number,
        firstName: student.first_name,
        lastName: student.last_name,
        isActive: student.is_active,
        hostelId: student.hostel_id,
        hostelName: student.hostel?.name || "School Hostel",
        balancePaise: student.metadata?.balance_paise || 5000,
        unlimitedCalls: Boolean(student.metadata?.unlimited_calls),
        guardians,
        studentSessionToken: `stu_${student.id}_${Date.now()}`,
      },
    });
  } catch (err) {
    console.error("[Verify Student ID Route Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}
