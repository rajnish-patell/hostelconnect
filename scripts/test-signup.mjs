import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, anonKey);
const admin = createClient(supabaseUrl, serviceKey);

async function testSignupAndPromote() {
  const email = "patelrajnish47@gmail.com";
  const password = "#Doremon420@";
  const fullName = "Rajnish Patel";

  console.log("Attempting client.auth.signUp...");

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "SUPER_ADMIN",
      },
    },
  });

  console.log("SignUp response:", { user: data?.user?.id, session: !!data?.session, error });

  if (error) {
    console.error("SignUp error:", error);
    return;
  }

  const userId = data.user.id;
  console.log("User created with ID:", userId);

  // Now ensure profile has SUPER_ADMIN role
  const { error: profError } = await admin
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "SUPER_ADMIN",
      is_active: true,
      email_verified: true,
    });

  if (profError) {
    console.error("Profile upsert error:", profError);
  } else {
    console.log("✅ Profile successfully set to SUPER_ADMIN!");
  }
}

testSignupAndPromote();
