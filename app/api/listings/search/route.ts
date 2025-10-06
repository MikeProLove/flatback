export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin'; // ← было getSupabaseServer

function toNum(v: string | null, d?: number) {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;
    const sb = getSupabaseAdmin(); // ← админ-клиент, чтобы карта видела публичные объявления

    const page = Math.max(1, toNum(sp.get('page'), 1)!);
    const perPage = Math.min(500, Math.max(1, toNum(sp.get('per_page'), 100)!));
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let q = sb
      .from('listings_with_cover')
      .select('id,title,price,city,lat,lng,cover_url', { count: 'exact' })
      .eq('status', 'published');

    const qStr = (sp.get('q') || '').trim();
    if (qStr) {
      const safe = qStr.replace(/%/g, '');
      q = q.or(`title.ilike.%${safe}%,city.ilike.%${safe}%,address.ilike.%${safe}%`);
    }

    const city = sp.get('city');
    if (city) q = q.ilike('city', city);

    const rooms = toNum(sp.get('rooms'));
    if (Number.isFinite(rooms)) q = q.eq('rooms', rooms);

    const priceMin = toNum(sp.get('price_min'));
    const priceMax = toNum(sp.get('price_max'));
    if (Number.isFinite(priceMin)) q = q.gte('price', priceMin);
    if (Number.isFinite(priceMax)) q = q.lte('price', priceMax);

    const areaMin = toNum(sp.get('area_min'));
    const areaMax = toNum(sp.get('area_max'));
    if (Number.isFinite(areaMin)) q = q.gte('area_total', areaMin);
    if (Number.isFinite(areaMax)) q = q.lte('area_total', areaMax);

    if (sp.get('with_photo') === 'on') q = q.not('cover_url', 'is', null);

    const bbox = sp.get('bbox'); // south,west,north,east
    if (bbox) {
      const [south, west, north, east] = bbox.split(',').map((s) => Number(s));
      if ([south, west, north, east].every((n) => Number.isFinite(n))) {
        q = q.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east);
      }
    }

    const sort = sp.get('sort') || 'latest';
    if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: true });
    else if (sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: true });
    else if (sort === 'area_desc') q = q.order('area_total', { ascending: false, nullsFirst: true });
    else q = q.order('created_at', { ascending: false });

    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      rows: data ?? [],
      count: count ?? 0,
      page,
      per_page: perPage,
    });
  } catch (e: any) {
    console.error('[listings/search]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
