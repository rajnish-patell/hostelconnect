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
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getUserProfile(userId) {
  try {
    const id = userId || (await getCurrentUser())?.id;
    if (!id) return null;

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (profile) return profile;

    // Fallback profile from auth user
    const user = await getCurrentUser();
    if (user && user.id === id) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Parent",
        role: user.user_metadata?.role || "PARENT",
        phone: user.user_metadata?.phone || "",
        is_active: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required to access this resource", 401, "UNAUTHENTICATED");
  }
  let profile = await getUserProfile(user.id);
  if (!profile) {
    profile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "Parent",
      role: user.user_metadata?.role || "PARENT",
      is_active: true,
    };
  }
  if (!profile.is_active) {
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

  const admin = createAdminClient();
  const { data: membership, error } = await admin
    .from("hostel_members")
    .select("*")
    .eq("hostel_id", hostelId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

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
    .maybeSingle();

  if (!parent) return false;

  const { data: relation } = await admin
    .from("student_guardians")
    .select("can_video_call, verification_status")
    .eq("student_id", studentId)
    .eq("parent_id", parent.id)
    .maybeSingle();

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
    .maybeSingle();

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
