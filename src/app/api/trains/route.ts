import { NextResponse } from 'next/server';
import { getTrainData } from '@/lib/data-source';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await getTrainData();
    if (data.error) {
        return NextResponse.json(data, { status: 500 });
    }
    return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' }
    });
}
