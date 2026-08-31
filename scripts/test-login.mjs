import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testLogin() {
  const email = "patelrajnish47@gmail.com";
  const password = "#Doremon420@";

  console.log(`Testing login for ${email}...`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login failed:", error);
  } else {
    console.log("Login successful! User ID:", data.user.id);
    console.log("Email:", data.user.email);

    // Fetch profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    console.log("Profile in database:", profile);
  }
}

testLogin();
