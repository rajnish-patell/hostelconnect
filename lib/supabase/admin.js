import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let adminClient = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Supabase Service Role Key missing. Admin client initialized with placeholders.");
  }

  adminClient = createSupabaseClient(
    supabaseUrl || "https://placeholder.supabase.co",
    serviceRoleKey || "placeholder-service-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}
