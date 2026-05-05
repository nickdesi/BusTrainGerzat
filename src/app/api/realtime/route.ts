import { NextResponse } from 'next/server';
import { getBusData } from '@/lib/data-source';
import { protectApiRequest } from '@/lib/api-protection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const blocked = protectApiRequest(request, 'realtime');
    if (blocked) return blocked;

    const data = await getBusData();
    return NextResponse.json(data, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
