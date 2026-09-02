import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/rbac";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(request) {
  try {
    const { user, profile } = await requireAuth();

    const allowedRoles = ["SUPER_ADMIN", "HOSTEL_ADMIN", "WARDEN", "STAFF"];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Dashboard reports require administrative privileges." } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30", 10)));
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
          { success: false, error: { code: "FORBIDDEN", message: "No active hostel membership." } },
          { status: 403 }
        );
      }
      hostelIdFilter = member.hostel_id;
    } else if (searchParams.get("hostelId")) {
      hostelIdFilter = searchParams.get("hostelId");
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch calls
    let callsQuery = admin
      .from("call_sessions")
      .select("id, status, duration_seconds, charge_paise, created_at, started_at, student:students(first_name, last_name, admission_number), parent:parents(first_name, last_name)")
      .gte("created_at", cutoffDate)
      .order("created_at", { ascending: false });

    if (hostelIdFilter) {
      callsQuery = callsQuery.eq("hostel_id", hostelIdFilter);
    }

    // 2. Fetch students count
    let studentsQuery = admin
      .from("students")
      .select("id, is_active", { count: "exact", head: true });
    if (hostelIdFilter) {
      studentsQuery = studentsQuery.eq("hostel_id", hostelIdFilter);
    }

    // 3. Fetch devices count
    let devicesQuery = admin
      .from("devices")
      .select("id, status", { count: "exact", head: true });
    if (hostelIdFilter) {
      devicesQuery = devicesQuery.eq("hostel_id", hostelIdFilter);
    }

    const [callsResult, studentsResult, devicesResult] = await Promise.all([
      callsQuery,
      studentsQuery,
      devicesQuery,
    ]);

    const calls = callsResult.data || [];
    const totalStudents = studentsResult.count || 0;
    const totalDevices = devicesResult.count || 0;

    let totalDurationSeconds = 0;
    let totalChargePaise = 0;
    let completedCalls = 0;
    let inProgressCalls = 0;
    let cancelledCalls = 0;

    const trendsMap = {};

    for (const c of calls) {
      if (c.status === "COMPLETED") completedCalls++;
      else if (c.status === "IN_PROGRESS") inProgressCalls++;
      else if (c.status === "CANCELLED" || c.status === "MISSED") cancelledCalls++;

      totalDurationSeconds += c.duration_seconds || 0;
      totalChargePaise += c.charge_paise || 0;

      const dateKey = c.created_at ? c.created_at.split("T")[0] : "unknown";
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { date: dateKey, calls: 0, durationMinutes: 0, revenueRupees: 0 };
      }
      trendsMap[dateKey].calls++;
      trendsMap[dateKey].durationMinutes += Math.ceil((c.duration_seconds || 0) / 60);
      trendsMap[dateKey].revenueRupees += (c.charge_paise || 0) / 100;
    }

    const callTrends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          periodDays: days,
          totalCalls: calls.length,
          completedCalls,
          inProgressCalls,
          cancelledCalls,
          totalDurationMinutes: Math.ceil(totalDurationSeconds / 60),
          totalRevenuePaise: totalChargePaise,
          totalRevenueRupees: totalChargePaise / 100,
          totalStudents,
          totalDevices,
        },
        callTrends,
        recentCalls: calls.slice(0, 5),
      },
    });
  } catch (err) {
    logger.error("Dashboard reports endpoint failed", err);
    const { response, status } = formatErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}
