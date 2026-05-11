import { NextResponse } from 'next/server';
import lineE1Data from '../../../../public/data/lineE1_data.json';

export async function GET() {
    return NextResponse.json(lineE1Data, {
        headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
    });
}
