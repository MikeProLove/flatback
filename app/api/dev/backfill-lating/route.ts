export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function geocode(address: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'flatback/1.0 (contact: admin@flatback.ru)' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const arr = (await res.json()) as any[];
  if (!arr?.[0]) return null;
  const { lat, lon } = arr[0];
  return { lat: Number(lat), lng: Number(lon) };
}

export async function POST() {
  try {
    const sb = getSupabaseAdmin();

    // берём опубликованные без координат
    const { data: rows, error } = await sb
      .from('listings')
      .select('id,address,city')
      .eq('status', 'published')
      .is('lat', null)
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const updated: string[] = [];
    for (const r of rows ?? []) {
      const addr = [r.address, r.city].filter(Boolean).join(', ');
      if (!addr) continue;
      const point = await geocode(addr);
      if (!point) continue;
      const { error: upErr } = await sb.from('listings').update(point).eq('id', r.id);
      if (!upErr) updated.push(r.id);
    }

    return NextResponse.json({ updated });
  } catch (e: any) {
    console.error('[backfill-latlng]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
