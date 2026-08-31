import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = "patelrajnish47@gmail.com";
  const password = "#Doremon420@";
  const fullName = "Rajnish Patel";

  console.log(`Setting up Super Admin account for ${email}...`);

  // 1. Create or update user in Supabase Auth
  const { data: userRecord, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "SUPER_ADMIN",
    },
  });

  let userId;

  if (userError) {
    if (userError.message.includes("already registered") || userError.status === 422) {
      console.log("User already exists in Auth. Updating password and email confirmation...");
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData.users.find((u) => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: "SUPER_ADMIN",
          },
        });
      }
    } else {
      console.error("Failed to create auth user:", userError);
      process.exit(1);
    }
  } else {
    userId = userRecord.user.id;
  }

  console.log(`User ID: ${userId}`);

  // 2. Insert or update in profiles table with SUPER_ADMIN role
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "SUPER_ADMIN",
      is_active: true,
      email_verified: true,
    });

  if (profileError) {
    console.error("Failed to update profile:", profileError);
    process.exit(1);
  }

  console.log("✅ Super Admin account successfully created and elevated to SUPER_ADMIN!");
}

createSuperAdmin();
