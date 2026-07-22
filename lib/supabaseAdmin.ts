import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Server-only client using the service role key, which bypasses Row Level
// Security. Never import this file from a client component — the key must
// never reach the browser. All reads/writes go through our own API routes.
//
// Lazily constructed so that `next build` (which loads route modules to
// collect metadata) doesn't require Supabase env vars to be present —
// they're only needed once a request actually comes in.
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local.example)"
    );
  }

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cached;
}
