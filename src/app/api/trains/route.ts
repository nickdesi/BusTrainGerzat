import { NextResponse } from 'next/server';
import { getTrainData } from '@/lib/data-source';
import { protectApiRequest } from '@/lib/api-protection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const blocked = protectApiRequest(request, 'trains');
    if (blocked) return blocked;

    const data = await getTrainData();
    if (data.error) {
        return NextResponse.json(data, {
            status: 500,
            headers: { 'Cache-Control': 'no-store' },
        });
    }
    return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' }
    });
}
