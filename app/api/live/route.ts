import { getLiveSnapshot } from "@/lib/data";

// Client-facing live feed (§4): reads the Supabase cache (or demo data),
// never a football provider, and is ISR-cached for 30s. The LiveTicker
// island polls this — the only client polling in the product, and it never
// leaves our own edge.
export const revalidate = 30;

export async function GET() {
  const snapshot = await getLiveSnapshot();
  return Response.json(snapshot);
}
