import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndApply() {
  console.log("Checking database connection and schema...");

  // Check if students table has balance_paise or metadata
  const { data: students, error: sErr } = await supabase.from("students").select("id, is_active, metadata").limit(1);
  if (sErr) {
    console.log("Students query error:", sErr.message);
  } else {
    console.log("Students table accessible. Count/first:", students);
  }

  // Check hostels table
  const { data: hostels, error: hErr } = await supabase.from("hostels").select("id, name, status, metadata").limit(1);
  if (hErr) {
    console.log("Hostels query error:", hErr.message);
  } else {
    console.log("Hostels table accessible:", hostels);
  }

  // Check parents table
  const { data: parents, error: pErr } = await supabase.from("parents").select("id, first_name, phone").limit(1);
  if (pErr) {
    console.log("Parents query error:", pErr.message);
  } else {
    console.log("Parents table accessible:", parents);
  }
}

checkAndApply();
