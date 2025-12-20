import { NextResponse } from 'next/server';
import lineE1Data from '../../../../public/data/lineE1_data.json';

export const dynamic = 'force-static';

export async function GET() {
    return NextResponse.json(lineE1Data);
}
