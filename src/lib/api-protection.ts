import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const API_RATE_LIMIT = 120;
const API_RATE_LIMIT_INTERVAL = 60000;

function forbidden(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

function getHeaderHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

export function checkSameOriginRequest(request: Request): NextResponse | null {
  const host = request.headers.get('host');
  if (!host) return null;

  const origin = request.headers.get('origin');
  if (origin) {
    const originHost = getHeaderHost(origin);
    if (!originHost) return forbidden('Invalid Origin header');
    if (originHost !== host) return forbidden('Cross-origin request not allowed');
  }

  const referer = request.headers.get('referer');
  if (referer) {
    const refererHost = getHeaderHost(referer);
    if (!refererHost) return forbidden('Invalid Referer header');
    if (refererHost !== host) return forbidden('Invalid Referer');
  }

  return null;
}

export function checkApiRateLimit(request: Request, scope: string): NextResponse | null {
  const ip = getClientIp(request);

  if (!rateLimit(`api-${scope}-${ip}`, API_RATE_LIMIT, API_RATE_LIMIT_INTERVAL)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  return null;
}

export function protectApiRequest(request: Request, scope: string): NextResponse | null {
  return checkApiRateLimit(request, scope) ?? checkSameOriginRequest(request);
}
