import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(request) {
  try {
    // Auth guard: Only SUPER_ADMIN or authenticated HOSTEL_ADMIN may access
    const { user, profile } = await requireAuth();
    const admin = createAdminClient();

    let query = admin
      .from("hostels")
      .select(`
        *,
        organization:organizations(id, name, owner_id),
        members:hostel_members(user_id, role, profile:profiles(full_name, email)),
        students:students(count),
        devices:devices(count)
      `)
      .order("created_at", { ascending: false });

    // Multi-tenant isolation: HOSTEL_ADMIN only sees their own hostel
    if (profile.role !== "SUPER_ADMIN") {
      const { data: member } = await admin
        .from("hostel_members")
        .select("hostel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      // Also check hostels where this user is admin via metadata
      if (member?.hostel_id) {
        query = query.eq("id", member.hostel_id);
      } else {
        const { data: ownedHostel } = await admin
          .from("hostels")
          .select("id")
          .eq("metadata->>admin_email", user.email)
          .single();

        if (ownedHostel?.id) {
          query = query.eq("id", ownedHostel.id);
        } else {
          return NextResponse.json({ success: true, data: [] });
        }
      }
    }

    const { data: hostels, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: hostels });
  } catch (err) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: err.status || 500 });
  }
}

export async function POST(request) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const body = await request.json();
    const admin = createAdminClient();

    const {
      name,
      code,
      city,
      adminEmail,
      adminPassword,
      callRate,
      callTimeMinutes,
      unlimitedCalls,
      status,
    } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, error: { message: "School name and Campus Code are required." } }, { status: 400 });
    }

    // 1. Create or get School Admin user in Auth if adminEmail is provided
    let schoolAdminId = null;
    if (adminEmail && adminPassword) {
      const { data: userRecord, error: uErr } = await admin.auth.admin.createUser({
        email: adminEmail.trim(),
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${name} Administrator`,
          role: "HOSTEL_ADMIN",
        },
      });

      if (uErr) {
        if (uErr.message?.includes("already registered")) {
          const { data: usersData } = await admin.auth.admin.listUsers();
          const existing = usersData.users.find(u => u.email === adminEmail.trim());
          if (existing) schoolAdminId = existing.id;
        } else {
          return NextResponse.json({ success: false, error: { message: uErr.message } }, { status: 400 });
        }
      } else {
        schoolAdminId = userRecord.user.id;
      }

      if (schoolAdminId) {
        await admin.from("profiles").upsert({
          id: schoolAdminId,
          email: adminEmail.trim(),
          full_name: `${name} Administrator`,
          role: "HOSTEL_ADMIN",
          is_active: true,
          email_verified: true,
        });
      }
    }

    // 2. Create or find Organization
    const slug = code.toLowerCase().replace(/[^a-z0-9]/g, "-") + `-${Date.now().toString().slice(-4)}`;
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: name,
        slug: slug,
        owner_id: schoolAdminId || "80c46229-4029-4b86-8021-5607671e1e6e",
        is_active: true,
      })
      .select()
      .single();

    const orgId = org?.id;

    // 3. Create Hostel record
    const { data: hostel, error: hErr } = await admin
      .from("hostels")
      .insert({
        organization_id: orgId,
        name: name,
        code: code.toUpperCase(),
        status: status || "ACTIVE",
        max_call_duration_minutes: Number(callTimeMinutes) || 15,
        address: { city: city || "India" },
        metadata: {
          city: city || "India",
          call_rate_per_minute: Number(callRate) || 2,
          unlimited_calls_enabled: Boolean(unlimitedCalls),
          admin_email: adminEmail || null,
        },
      })
      .select()
      .single();

    if (hErr) {
      return NextResponse.json({ success: false, error: { message: hErr.message } }, { status: 400 });
    }

    // 4. Link School Admin to Hostel
    if (schoolAdminId && hostel) {
      await admin.from("hostel_members").upsert({
        hostel_id: hostel.id,
        user_id: schoolAdminId,
        role: "HOSTEL_ADMIN",
        is_active: true,
      });
    }

    return NextResponse.json({ success: true, data: hostel }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const body = await request.json();
    const admin = createAdminClient();

    const { id, status, callRate, callTimeMinutes, unlimitedCalls, name, city } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: { message: "Hostel ID is required." } }, { status: 400 });
    }

    // Fetch existing metadata
    const { data: existing } = await admin.from("hostels").select("metadata").eq("id", id).single();
    const metadata = {
      ...(existing?.metadata || {}),
      ...(callRate !== undefined && { call_rate_per_minute: Number(callRate) }),
      ...(unlimitedCalls !== undefined && { unlimited_calls_enabled: Boolean(unlimitedCalls) }),
      ...(city && { city }),
    };

    const updates = {
      metadata,
      ...(status && { status }),
      ...(name && { name }),
      ...(callTimeMinutes !== undefined && { max_call_duration_minutes: Number(callTimeMinutes) }),
    };

    const { data: updated, error } = await admin
      .from("hostels")
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

export async function DELETE(request) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: { message: "Hostel ID is required." } }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Get all students in this hostel
    const { data: students } = await admin
      .from("students")
      .select("id")
      .eq("hostel_id", id);

    const studentIds = (students || []).map((s) => s.id);

    // 2. Get all parent IDs linked to these students
    let parentIds = [];
    if (studentIds.length > 0) {
      const { data: guardians } = await admin
        .from("student_guardians")
        .select("parent_id")
        .in("student_id", studentIds);

      parentIds = [...new Set((guardians || []).map((g) => g.parent_id))];
    }

    // 3. Delete call sessions
    await admin.from("call_sessions").delete().eq("hostel_id", id);

    // 4. Delete student guardians and students
    if (studentIds.length > 0) {
      await admin.from("student_guardians").delete().in("student_id", studentIds);
      await admin.from("students").delete().eq("hostel_id", id);
    }

    // 5. Delete devices, rooms, schedules, and memberships
    await admin.from("devices").delete().eq("hostel_id", id);
    await admin.from("rooms").delete().eq("hostel_id", id);
    await admin.from("hostel_members").delete().eq("hostel_id", id);

    // 6. Clean up or deactivate parents who have no other schools
    for (const pId of parentIds) {
      const { data: remainingGuardians } = await admin
        .from("student_guardians")
        .select("id")
        .eq("parent_id", pId);

      if (!remainingGuardians || remainingGuardians.length === 0) {
        const { data: pRecord } = await admin.from("parents").select("user_id").eq("id", pId).single();
        if (pRecord?.user_id) {
          await admin.from("profiles").update({ is_active: false }).eq("id", pRecord.user_id);
          try {
            await admin.auth.admin.deleteUser(pRecord.user_id);
          } catch (_) {}
        }
        await admin.from("parents").delete().eq("id", pId);
      }
    }

    // 7. Delete Hostel record
    const { error } = await admin.from("hostels").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Hostel campus and associated data removed cleanly." });
  } catch (err) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}
