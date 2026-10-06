import { getLiveWorld, LIVE } from '@/server/live';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Server-sent events: one `snapshot` event every few seconds. */
export function GET() {
  if (!LIVE) return new Response('live feed disabled: set DATA_SOURCE=live', { status: 503 });
  const world = getLiveWorld();
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          controller.enqueue(enc.encode(`event: snapshot\ndata: ${JSON.stringify(world.snapshot())}\n\n`));
        } catch {
          if (timer) clearInterval(timer);
        }
      };
      send();
      timer = setInterval(send, 4000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' },
  });
}
