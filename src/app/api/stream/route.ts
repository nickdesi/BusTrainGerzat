import { getBusData, getTrainData } from '@/lib/data-source';
import { checkSameOriginRequest, getClientIp } from '@/lib/api-protection';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Basic Rate Limiting (Max 10 new SSE connections per minute per IP)
    const ip = getClientIp(request);
    if (!rateLimit(`sse-${ip}`, 10, 60000)) {
        return new Response('Too Many Requests', { status: 429 });
    }

    // 2. Basic Cross-Origin Protection
    const blocked = checkSameOriginRequest(request);
    if (blocked) return blocked;

    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController<Uint8Array>, payload: string) => {
        controller.enqueue(encoder.encode(payload));
    };

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            send(controller, ': connected\n\n');

            // Send initial data immediately
            const sendUpdate = async () => {
                try {
                    const [busData, trainData] = await Promise.all([
                        getBusData(),
                        getTrainData()
                    ]);

                    const data = JSON.stringify({
                        bus: busData,
                        train: trainData,
                        timestamp: Date.now()
                    });

                    send(controller, `data: ${data}\n\n`);
                } catch (error) {
                    console.error('SSE Error:', error);
                    send(controller, `event: transport-error\ndata: ${JSON.stringify({ message: 'Unable to refresh transport data' })}\n\n`);
                }
            };

            await sendUpdate();

            // Keep the connection alive through proxies/CDNs between 2-minute data refreshes.
            const heartbeat = setInterval(() => {
                if (request.signal.aborted) {
                    clearInterval(heartbeat);
                    return;
                }
                send(controller, ': heartbeat\n\n');
            }, 25000);

            // Then send updates every 2 minutes (matches server cache TTL)
            const interval = setInterval(async () => {
                if (request.signal.aborted) {
                    clearInterval(interval);
                    return;
                }
                await sendUpdate();
            }, 120000);

            // Cleanup when closed
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch {
                    // Connection may already be closed by the client/proxy.
                }
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
