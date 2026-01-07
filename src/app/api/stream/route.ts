import { getBusData, getTrainData } from '@/lib/data-source';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
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

                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (error) {
                    console.error('SSE Error:', error);
                    controller.error(error);
                }
            };

            await sendUpdate();

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
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
