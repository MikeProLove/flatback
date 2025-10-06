// app/api/listings/search/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { listingsSearch, parseSearchParams } from '@/lib/listings-search';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const input = parseSearchParams(url.searchParams);
    const res = await listingsSearch(input);
    return NextResponse.json(res, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'search_failed' }, { status: 500 });
  }
}
