// app/api/listings/map/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function toNum(v: string | null) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const sb = getSupabaseAdmin();
    const url = new URL(req.url);
    const sp = url.searchParams;

    // Опциональные фильтры (совместим с /listings)
    const qStr = (sp.get('q') || '').trim();
    const city = sp.get('city') || undefined;
    const rooms = toNum(sp.get('rooms'));
    const priceMin = toNum(sp.get('price_min'));
    const priceMax = toNum(sp.get('price_max'));
    const areaMin = toNum(sp.get('area_min'));
    const areaMax = toNum(sp.get('area_max'));
    const withPhoto = sp.get('with_photo') === 'on';

    // bbox=south,west,north,east
    const bbox = sp.get('bbox');
    let south: number | null = null,
      west: number | null = null,
      north: number | null = null,
      east: number | null = null;
    if (bbox) {
      const parts = bbox.split(',').map((s) => Number(s));
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        [south, west, north, east] = parts;
      }
    }

    // Берём из вьюхи cover_url (если есть). Нужны только опубликованные с координатами.
    let q = sb
      .from('listings_with_cover')
      .select('id,title,price,city,lat,lng,cover_url')
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (qStr) {
      const safe = qStr.replace(/%/g, '');
      q = q.or(`title.ilike.%${safe}%,city.ilike.%${safe}%,address.ilike.%${safe}%`);
    }
    if (city) q = q.ilike('city', city);
    if (Number.isFinite(rooms as number)) q = q.eq('rooms', rooms);
    if (Number.isFinite(priceMin as number)) q = q.gte('price', priceMin);
    if (Number.isFinite(priceMax as number)) q = q.lte('price', priceMax);
    if (Number.isFinite(areaMin as number)) q = q.gte('area_total', areaMin);
    if (Number.isFinite(areaMax as number)) q = q.lte('area_total', areaMax);
    if (withPhoto) q = q.not('cover_url', 'is', null);

    if (
      Number.isFinite(south as number) &&
      Number.isFinite(west as number) &&
      Number.isFinite(north as number) &&
      Number.isFinite(east as number)
    ) {
      q = q.gte('lat', south!).lte('lat', north!).gte('lng', west!).lte('lng', east!);
    }

    // Ограничим разумно
    q = q.limit(2000);

    const { data, error } = await q;
    if (error) {
      console.error('[map] select listings', error);
      return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    }

    const rows =
      (data ?? []).map((r) => ({
        id: r.id,
        title: (r as any).title ?? 'Объявление',
        price: Number((r as any).price) || 0,
        city: (r as any).city ?? '',
        lat: Number((r as any).lat),
        lng: Number((r as any).lng),
        cover_url: (r as any).cover_url || null,
      })) || [];

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error('[map] GET error', e);
    return NextResponse.json({ error: 'server', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
