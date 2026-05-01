import { NextResponse } from 'next/server';
import { getFreshnessStatus } from '@/lib/gtfs-freshness';
import { getTrainFreshnessStatus } from '@/services/train.service';

export const dynamic = 'force-dynamic';

export async function GET() {
    const busFreshness = getFreshnessStatus();
    const trainFreshness = getTrainFreshnessStatus();

    return NextResponse.json({
        bus: busFreshness,
        train: trainFreshness,
        timestamp: Math.floor(Date.now() / 1000)
    });
}
