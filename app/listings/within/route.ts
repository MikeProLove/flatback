export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Num = number | string | null | undefined;
const toNum = (v: Num) => (v == null || v === '' ? null : Number(v));

function bbox(lat: number, lng: number, radiusKm: number) {
  const R = 6371;
  const dLat = (radiusKm / R) * (180 / Math.PI);
  const dLng = (radiusKm / (R * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = toNum(url.searchParams.get('lat'));
    const lng = toNum(url.searchParams.get('lng'));
    const radiusKm = toNum(url.searchParams.get('radiusKm')) ?? 25; // шире по умолчанию

    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'bad_coords' }, { status: 400 });
    }

    const qText = (url.searchParams.get('q') || '').trim();
    const city = (url.searchParams.get('city') || '').trim();
    const rooms = toNum(url.searchParams.get('rooms'));
    const priceMin = toNum(url.searchParams.get('price_min'));
    const priceMax = toNum(url.searchParams.get('price_max'));
    const areaMin = toNum(url.searchParams.get('area_min'));
    const areaMax = toNum(url.searchParams.get('area_max'));

    const sb = getSupabaseAdmin();
    const box = bbox(Number(lat), Number(lng), Number(radiusKm));

    // Берём напрямую из таблицы listings (а не из вьюхи)
    let q = sb
      .from('listings')
      .select('id,title,price,city,rooms,area_total,lat,lng,status')
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng)
      .order('created_at', { ascending: false });

    if (city) q = q.ilike('city', `%${city}%`);
    if (rooms != null) q = q.eq('rooms', rooms);
    if (priceMin != null) q = q.gte('price', priceMin);
    if (priceMax != null) q = q.lte('price', priceMax);
    if (areaMin != null) q = q.gte('area_total', areaMin);
    if (areaMax != null) q = q.lte('area_total', areaMax);
    if (qText) {
      const pat = `%${qText.replace(/[%_]/g, '\\$&')}%`;
      q = q.or(`title.ilike.${pat},city.ilike.${pat},address.ilike.${pat},description.ilike.${pat}`);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });

    const rows = (data ?? []).filter((r) => {
      if (r.lat == null || r.lng == null) return false;
      const d = haversineKm(Number(lat), Number(lng), Number(r.lat), Number(r.lng));
      return d <= Number(radiusKm);
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error('[listings/within] GET', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
