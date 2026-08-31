import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedPlatform() {
  console.log("Seeding complete platform data...");

  // 1. Get or create Super Admin profile
  const { data: superAdminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "patelrajnish47@gmail.com")
    .single();

  const superAdminId = superAdminProfile?.id;
  console.log("Super Admin ID:", superAdminId);

  // 2. Create School Admin user & profile if not exists
  const schoolAdminEmail = "admin@greenwood.edu";
  const { data: schoolUserRecord, error: suErr } = await supabase.auth.admin.createUser({
    email: schoolAdminEmail,
    password: "#Greenwood2026@",
    email_confirm: true,
    user_metadata: { full_name: "Greenwood Campus Principal", role: "HOSTEL_ADMIN" },
  });

  let schoolAdminId = schoolUserRecord?.user?.id;
  if (suErr) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === schoolAdminEmail);
    if (existing) schoolAdminId = existing.id;
  }

  if (schoolAdminId) {
    await supabase.from("profiles").upsert({
      id: schoolAdminId,
      email: schoolAdminEmail,
      full_name: "Greenwood Campus Principal",
      role: "HOSTEL_ADMIN",
      is_active: true,
      email_verified: true,
    });
  }

  // 3. Create Organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert({
      name: "Greenwood Group of Institutions",
      slug: "greenwood-institutions",
      owner_id: superAdminId || schoolAdminId,
      is_active: true,
    })
    .select()
    .single();

  const orgId = org?.id;
  console.log("Organization ID:", orgId);

  // 4. Create Hostel / School
  const { data: hostel, error: hErr } = await supabase
    .from("hostels")
    .upsert({
      organization_id: orgId,
      name: "Greenwood Residential Campus",
      code: "GWD-01",
      status: "ACTIVE",
      max_call_duration_minutes: 15,
      metadata: {
        call_rate_per_minute: 2,
        unlimited_calls_enabled: false,
      },
    })
    .select()
    .single();

  const hostelId = hostel?.id;
  console.log("Hostel/School ID:", hostelId);

  // 5. Link School Admin to Hostel
  if (schoolAdminId && hostelId) {
    await supabase.from("hostel_members").upsert({
      hostel_id: hostelId,
      user_id: schoolAdminId,
      role: "HOSTEL_ADMIN",
      is_active: true,
    });
  }

  // 6. Create Parent Record for Rajnish Patel
  const parentPhone = "8349655888";
  const parentEmail = "patelrajnish47@gmail.com";

  let { data: parentRecord } = await supabase
    .from("parents")
    .select("id")
    .eq("phone", parentPhone)
    .single();

  if (!parentRecord) {
    const { data: newParent } = await supabase
      .from("parents")
      .insert({
        user_id: superAdminId,
        first_name: "Rajnish",
        last_name: "Patel",
        email: parentEmail,
        phone: parentPhone,
        is_active: true,
      })
      .select()
      .single();
    parentRecord = newParent;
  }

  console.log("Parent Record ID:", parentRecord?.id);

  // 7. Create 3 Sample Students with Student IDs
  const sampleStudents = [
    {
      hostel_id: hostelId,
      first_name: "Aarav",
      last_name: "Patel",
      admission_number: "STU-1001",
      class_grade: "Class 6",
      section: "A",
      is_active: true,
      metadata: {
        balance_paise: 6000, // ₹60 balance
        unlimited_calls: false,
        max_call_duration_minutes: 15,
        call_rate_per_minute: 2,
      },
    },
    {
      hostel_id: hostelId,
      first_name: "Ananya",
      last_name: "Patel",
      admission_number: "STU-1002",
      class_grade: "Class 4",
      section: "B",
      is_active: true,
      metadata: {
        balance_paise: 10000, // ₹100 balance
        unlimited_calls: true, // Unlimited calling enabled for demo
        max_call_duration_minutes: 20,
        call_rate_per_minute: 2,
      },
    },
    {
      hostel_id: hostelId,
      first_name: "Rohan",
      last_name: "Sharma",
      admission_number: "STU-1003",
      class_grade: "Class 8",
      section: "C",
      is_active: true,
      metadata: {
        balance_paise: 4000, // ₹40 balance
        unlimited_calls: false,
        max_call_duration_minutes: 10,
        call_rate_per_minute: 2,
      },
    },
  ];

  for (const s of sampleStudents) {
    const { data: createdStudent } = await supabase
      .from("students")
      .upsert(s, { onConflict: "hostel_id,admission_number" })
      .select()
      .single();

    if (createdStudent && parentRecord?.id) {
      // Auto-connect Student ↔️ Parent
      await supabase.from("student_guardians").upsert({
        student_id: createdStudent.id,
        parent_id: parentRecord.id,
        relationship: "FATHER",
        is_primary: true,
        verification_status: "VERIFIED",
        can_video_call: true,
      }, { onConflict: "student_id,parent_id" });
    }
  }

  // 8. Create a shared Kiosk Tablet device
  const { data: device } = await supabase
    .from("devices")
    .upsert({
      hostel_id: hostelId,
      name: "Main Lobby Touch Terminal A",
      description: "Touchscreen calling terminal in Dormitory Lobby",
      device_type: "tablet",
      status: "ACTIVE",
    })
    .select()
    .single();

  console.log("Device ID:", device?.id);

  console.log("✅ Complete platform data seeded successfully!");
}

seedPlatform().catch(console.error);
