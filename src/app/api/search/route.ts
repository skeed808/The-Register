import { NextResponse, type NextRequest } from 'next/server';
import { liveAvailable, RegisterBusyError, searchCompanies } from '@/lib/sources/companies-house';
import { hashIp, hit, LIMITS } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ items: [] });
  if (!liveAvailable()) return NextResponse.json({ items: [], unavailable: 'Live search is not configured on this deployment.' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  const n = await hit(`search:${await hashIp(ip)}`, 300);
  if (n > LIMITS.searchPer5Min) return NextResponse.json({ items: [], busy: 300 }, { status: 429 });

  try {
    return NextResponse.json({ items: await searchCompanies(q) });
  } catch (e) {
    if (e instanceof RegisterBusyError) return NextResponse.json({ items: [], busy: e.retryAfter }, { status: 429 });
    return NextResponse.json({ items: [], error: 'The register could not be reached.' }, { status: 502 });
  }
}
