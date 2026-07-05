import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public read-path defaults for the worldcup-pulse cache. The anon key is
// public by design (it ships in every Supabase client bundle) and RLS
// restricts it to read-only selects — see supabase/migrations. Env vars
// override for other environments. The service-role key is never baked.
const DEFAULT_URL = "https://svjepmqfemctnyzzyxwc.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amVwbXFmZW1jdG55enp5eHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjE2ODEsImV4cCI6MjA5ODU5NzY4MX0.qrGHM-_IFdbSerQNeB-PRT0NXNCCv8TX9C0_dRJ_XNM";

let anonClient: SupabaseClient | null | undefined;

/** Read-only client (anon key, RLS-scoped). */
export function supabaseAnon(): SupabaseClient | null {
  if (anonClient !== undefined) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;
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
  return supabaseAnon() !== null;
}
