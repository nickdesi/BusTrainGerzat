import { NextResponse } from 'next/server';
import line20Data from '../../../../public/data/line20_data.json';

export const dynamic = 'force-static';

export async function GET() {
    return NextResponse.json(line20Data);
}
