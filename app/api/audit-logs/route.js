import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/rbac";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(request) {
  try {
    const { user, profile } = await requireAuth();

    // Only administrative roles can view audit logs
    const allowedRoles = ["SUPER_ADMIN", "HOSTEL_ADMIN", "WARDEN"];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Audit logs access requires administrative privileges." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const admin = createAdminClient();
    let hostelIdFilter = null;

    if (profile.role !== "SUPER_ADMIN") {
      const { data: member } = await admin
        .from("hostel_members")
        .select("hostel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "No active hostel assignment found." } },
          { status: 403 }
        );
      }
      hostelIdFilter = member.hostel_id;
    } else if (searchParams.get("hostelId")) {
      hostelIdFilter = searchParams.get("hostelId");
    }

    let query = admin
      .from("audit_logs")
      .select("id, actor_id, action, resource_type, resource_id, description, metadata, hostel_id, ip_address, created_at, hostel:hostels(name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (hostelIdFilter) {
      query = query.eq("hostel_id", hostelIdFilter);
    }
    if (action) {
      query = query.ilike("action", `%${action}%`);
    }
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, count, error: queryErr } = await query.range(offset, offset + limit - 1);

    if (queryErr) {
      logger.error("Failed to fetch audit logs", queryErr);
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to retrieve audit trail." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (err) {
    logger.error("Audit logs endpoint failed", err);
    const { response, status } = formatErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}
