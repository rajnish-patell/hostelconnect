import { z } from "zod";

// =============================================================================
// AUTH SCHEMAS
// =============================================================================
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters with letters & numbers"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number required").optional().or(z.literal("")),
  role: z.enum(["PARENT", "HOSTEL_ADMIN"]).default("PARENT"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// =============================================================================
// HOSTEL SCHEMAS
// =============================================================================
export const hostelSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  name: z.string().min(2, "Hostel name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  timezone: z.string().default("Asia/Kolkata"),
  maxCallDurationMinutes: z.coerce.number().min(5).max(60).default(15),
  maxCallsPerStudentPerDay: z.coerce.number().min(1).max(20).default(5),
  maxCallsPerParentPerDay: z.coerce.number().min(1).max(20).default(5),
  allowedCallStartTime: z.string().default("08:00:00"),
  allowedCallEndTime: z.string().default("21:00:00"),
  emergencyCallsEnabled: z.boolean().default(true),
});

// =============================================================================
// STUDENT SCHEMAS
// =============================================================================
export const studentSchema = z.object({
  hostelId: z.string().uuid("Invalid hostel ID"),
  roomId: z.string().uuid("Invalid room ID").optional().nullable(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  admissionNumber: z.string().min(1, "Admission number is required"),
  classGrade: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
});

// =============================================================================
// PARENT / GUARDIAN LINK SCHEMAS
// =============================================================================
export const parentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  alternatePhone: z.string().optional().nullable(),
});

export const studentGuardianLinkSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  parentId: z.string().uuid("Invalid parent ID"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "GRANDPARENT", "SIBLING", "OTHER"]).default("GUARDIAN"),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canVideoCall: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

// =============================================================================
// DEVICE SCHEMAS
// =============================================================================
export const deviceRegistrationSchema = z.object({
  hostelId: z.string().uuid("Invalid hostel ID"),
  name: z.string().min(2, "Device name is required"),
  description: z.string().optional().nullable(),
  deviceType: z.string().default("tablet"),
});

export const deviceActivationSchema = z.object({
  code: z.string().min(6, "Activation code must be at least 6 characters").max(12),
  userAgent: z.string().optional(),
});

// =============================================================================
// CALL & SCHEDULING SCHEMAS
// =============================================================================
export const initiateCallSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  parentId: z.string().optional().nullable(),
  deviceId: z.string().optional().nullable(),
  isEmergency: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const scheduleCallSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  parentId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCallStatusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "SCHEDULED",
    "APPROVED",
    "READY",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "MISSED",
    "FAILED",
  ]),
  endReason: z.string().optional().nullable(),
});

// =============================================================================
// PAYMENT SCHEMAS
// =============================================================================
export const createPaymentOrderSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID required"),
  razorpay_payment_id: z.string().min(1, "Payment ID required"),
  razorpay_signature: z.string().min(1, "Signature required"),
  organizationId: z.string().uuid("Invalid organization ID"),
  planId: z.string().uuid("Invalid plan ID"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});
