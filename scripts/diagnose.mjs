import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function diagnose() {
  console.log("Diagnosing Supabase database...");

  // Check plans
  const { data: plans, error: plansErr } = await supabase.from("plans").select("name, slug");
  console.log("Plans query:", { count: plans?.length, error: plansErr?.message });

  // Check profiles
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("email, role");
  console.log("Profiles query:", { count: profiles?.length, error: profErr?.message });

  // Check auth users list
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  console.log("Auth users query:", { count: users?.users?.length, users: users?.users?.map(u => u.email), error: usersErr?.message });
}

diagnose();
