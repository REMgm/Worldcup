import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Clients are created lazily so builds and deployments without Supabase
// credentials still succeed — the data layer falls back to demo data.

let anonClient: SupabaseClient | null | undefined;

/** Read-only client (anon key, RLS-scoped). Null when not configured. */
export function supabaseAnon(): SupabaseClient | null {
  if (anonClient !== undefined) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  anonClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return anonClient;
}

/** Service-role client for cron ingest. Server-only. Null when not configured. */
export function supabaseService(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
