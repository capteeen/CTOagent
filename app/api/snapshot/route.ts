import { getLiveWorld, LIVE } from '@/server/live';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One-shot JSON snapshot (debugging, external consumers). */
export function GET() {
  if (!LIVE) return Response.json({ error: 'live feed disabled: set DATA_SOURCE=live' }, { status: 503 });
  const w = getLiveWorld();
  const { snap } = w.snapshot();
  return new Response(JSON.stringify({ ...snap, pumpportal: w.ppStatus, tracked: snap.tokens.length }), { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
}
