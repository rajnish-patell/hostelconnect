import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthDirect() {
  const email = "patelrajnish47@gmail.com";
  const password = "#Doremon420@";

  console.log("Testing direct client login with password...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("Direct login result:", {
    success: !error,
    userId: data?.user?.id,
    error: error?.message,
    status: error?.status,
  });
}

testAuthDirect();
