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

    const { studentId } = validation.data;

    // 2. Query database to verify student exists
    const admin = createAdminClient();
    const { data: student, error } = await admin
      .from("students")
      .select("id, admission_number, first_name, last_name, is_active, hostel_id")
      .eq("admission_number", studentId)
      .maybeSingle(); // Return null if not found (instead of error)

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (which is fine)
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
            message: `Student ID "${studentId}" not found. Please check and try again.`,
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
    const { data: hostel, error: hostelErr } = await admin
      .from("hostels")
      .select("id, status")
      .eq("id", student.hostel_id)
      .single();

    if (hostelErr || !hostel || hostel.status !== "ACTIVE") {
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

    // 6. Success: Return student info
    return NextResponse.json({
      success: true,
      data: {
        studentId: student.admission_number,
        firstName: student.first_name,
        lastName: student.last_name,
        isActive: student.is_active,
        hostelId: student.hostel_id,
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
