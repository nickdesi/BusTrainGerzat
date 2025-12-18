import { NextResponse } from 'next/server';
import { getBusData } from '@/lib/data-source';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await getBusData();
    return NextResponse.json(data);
}
