import { getBusData, getTrainData } from '@/lib/data-source';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Basic Rate Limiting (Max 10 new SSE connections per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    if (!rateLimit(`sse-${ip}`, 10, 60000)) {
        return new Response('Too Many Requests', { status: 429 });
    }

    // 2. Basic Cross-Origin Protection
    // In production, you should use a whitelist of allowed origins.
    const host = request.headers.get('host');
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (origin && host) {
        try {
            const originUrl = new URL(origin);
            if (originUrl.host !== host) {
                return new Response('Forbidden: Cross-origin SSE not allowed', { status: 403 });
            }
        } catch {
            return new Response('Forbidden: Invalid Origin header', { status: 403 });
        }
    }

    if (referer && host) {
        try {
            const refererUrl = new URL(referer);
            if (refererUrl.host !== host) {
                return new Response('Forbidden: Invalid Referer', { status: 403 });
            }
        } catch {
            // If referer is not a valid URL, we might want to block it or ignore it.
            // For SSE, referer is usually reliable.
            return new Response('Forbidden: Invalid Referer header', { status: 403 });
        }
    }

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
                    send(controller, `event: error\ndata: ${JSON.stringify({ message: 'Unable to refresh transport data' })}\n\n`);
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
