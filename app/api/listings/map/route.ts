// app/api/listings/map/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Берём только опубликованные и у которых есть координаты
    const { data, error } = await sb
      .from('listings')
      .select('id,title,price,city,lat,lng')
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(1000);

    if (error) {
      console.error('[map] select listings', error);
      return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    }

    // Возвращаем лёгкий массив точек
    const rows =
      (data ?? []).map((r) => ({
        id: r.id,
        title: r.title ?? 'Объявление',
        price: Number(r.price) || 0,
        city: r.city ?? '',
        lat: Number(r.lat),
        lng: Number(r.lng),
      })) || [];

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error('[map] GET error', e);
    return NextResponse.json({ error: 'server', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
