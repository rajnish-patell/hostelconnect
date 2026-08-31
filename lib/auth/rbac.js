import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class AuthError extends Error {
  constructor(message = "Unauthorized", status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile(userId) {
  const supabase = await createClient();
  const id = userId || (await getCurrentUser())?.id;
  if (!id) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return profile;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required to access this resource", 401, "UNAUTHENTICATED");
  }
  const profile = await getUserProfile(user.id);
  if (!profile || !profile.is_active) {
    throw new AuthError("Your account is deactivated or invalid", 403, "ACCOUNT_INACTIVE");
  }
  return { user, profile };
}

export async function requireRole(allowedRoles = []) {
  const { user, profile } = await requireAuth();

  if (profile.role === "SUPER_ADMIN") {
    return { user, profile };
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError(`Access forbidden: requires role in [${allowedRoles.join(", ")}]`, 403, "FORBIDDEN");
  }

  return { user, profile };
}

export async function requireHostelAccess(hostelId, allowedRoles = ["HOSTEL_ADMIN", "WARDEN", "STAFF"]) {
  const { user, profile } = await requireAuth();

  if (profile.role === "SUPER_ADMIN") {
    return { user, profile, isSuperAdmin: true };
  }

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("hostel_members")
    .select("*")
    .eq("hostel_id", hostelId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !membership || !allowedRoles.includes(membership.role)) {
    throw new AuthError("You do not have administrative access to this hostel", 403, "HOSTEL_ACCESS_DENIED");
  }

  return { user, profile, membership };
}

export async function verifyParentStudentRelation(studentId, parentUserId) {
  const admin = createAdminClient();

  const { data: parent } = await admin
    .from("parents")
    .select("id")
    .eq("user_id", parentUserId)
    .single();

  if (!parent) return false;

  const { data: relation } = await admin
    .from("student_guardians")
    .select("can_video_call, verification_status")
    .eq("student_id", studentId)
    .eq("parent_id", parent.id)
    .single();

  if (!relation || relation.verification_status !== "VERIFIED" || !relation.can_video_call) {
    return false;
  }

  return true;
}

export async function verifyDeviceSession(sessionToken) {
  if (!sessionToken) return null;
  const admin = createAdminClient();

  const { data: session, error } = await admin
    .from("device_sessions")
    .select("*, device:devices(*)")
    .eq("session_token", sessionToken)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session || !session.device || session.device.status !== "ACTIVE") {
    return null;
  }

  // Update last activity
  await admin
    .from("device_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", session.id);

  return session;
}
