import { NextResponse } from 'next/server';
import { protectApiRequest } from '@/lib/api-protection';
import { getFreshnessStatus } from '@/lib/gtfs-freshness';
import { getTrainFreshnessStatus } from '@/services/train.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const blocked = protectApiRequest(request, 'freshness');
    if (blocked) return blocked;

    const busFreshness = getFreshnessStatus();
    const trainFreshness = getTrainFreshnessStatus();

    return NextResponse.json({
        bus: busFreshness,
        train: trainFreshness,
        timestamp: Math.floor(Date.now() / 1000)
    }, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
