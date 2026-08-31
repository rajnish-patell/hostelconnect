import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDb() {
  const { data, error } = await supabase.from("profiles").select("*").limit(1);
  console.log("Profiles query result:", { data, error });
}

checkDb();
