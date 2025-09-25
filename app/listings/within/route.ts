// app/api/listings/within/route.ts
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
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = toNum(url.searchParams.get('lat'));
    const lng = toNum(url.searchParams.get('lng'));
    const radiusKm = toNum(url.searchParams.get('radiusKm')) ?? 5;

    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'bad_coords' }, { status: 400 });
    }

    const filters = {
      q: url.searchParams.get('q') || null,
      city: url.searchParams.get('city') || null,
      rooms: toNum(url.searchParams.get('rooms')),
      price_min: toNum(url.searchParams.get('price_min')),
      price_max: toNum(url.searchParams.get('price_max')),
      area_min: toNum(url.searchParams.get('area_min')),
      area_max: toNum(url.searchParams.get('area_max')),
      with_photos: url.searchParams.get('with_photos') === '1',
    };

    const sb = getSupabaseAdmin();
    const box = bbox(Number(lat), Number(lng), Number(radiusKm));

    let q = sb
      .from('listings_with_cover')
      .select(
        'id,title,price,city,rooms,area_total,cover_url,lat,lng,created_at,status'
      )
      .eq('status', 'published')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng)
      .order('created_at', { ascending: false });

    if (filters.city) q = q.ilike('city', `%${filters.city}%`);
    if (filters.rooms != null) q = q.eq('rooms', filters.rooms);
    if (filters.price_min != null) q = q.gte('price', filters.price_min);
    if (filters.price_max != null) q = q.lte('price', filters.price_max);
    if (filters.area_min != null) q = q.gte('area_total', filters.area_min);
    if (filters.area_max != null) q = q.lte('area_total', filters.area_max);
    if (filters.q) {
      // простое текстовое совпадение
      q = q.or(
        `title.ilike.%${filters.q}%,city.ilike.%${filters.q}%,address.ilike.%${filters.q}%,description.ilike.%${filters.q}%`
      );
    }
    if (filters.with_photos) q = q.not('cover_url', 'is', null);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });

    // финальная точная фильтрация по радиусу
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
