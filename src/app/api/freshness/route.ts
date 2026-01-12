import { NextResponse } from 'next/server';
import { getFreshnessStatus } from '@/lib/gtfs-freshness';

export const dynamic = 'force-dynamic';

export async function GET() {
    const busFreshness = getFreshnessStatus();

    // Train data is always fetched realtime from SNCF API, no local cache
    const trainFreshness = { isValid: true };

    return NextResponse.json({
        bus: busFreshness,
        train: trainFreshness,
        timestamp: Math.floor(Date.now() / 1000)
    });
}
