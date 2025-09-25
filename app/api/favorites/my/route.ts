// app/api/favorites/my/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();

    const { data: favs, error: fErr } = await sb
      .from('favorites')
      .select('listing_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fErr) return NextResponse.json({ error: 'db', message: fErr.message }, { status: 500 });

    const ids = (favs ?? []).map(f => f.listing_id);
    if (!ids.length) return NextResponse.json({ rows: [] });

    // Пробуем вьюху с обложкой
    const tryView = await sb
      .from('listings_with_cover')
      .select('id,title,price,city,rooms,area_total,cover_url,created_at')
      .in('id', ids);

    let listings: any[] = [];
    if (!tryView.error) {
      listings = tryView.data ?? [];
    } else {
      // Фолбек: listings + первая фотка
      const { data: ls } = await sb
        .from('listings')
        .select('id,title,price,city,rooms,area_total,created_at')
        .in('id', ids);
      const map = new Map<string, any>();
      (ls ?? []).forEach(r => map.set(r.id, { ...r, cover_url: null }));
      const { data: ph } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order,created_at')
        .in('listing_id', ids)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      for (const p of ph ?? []) {
        const row = map.get(p.listing_id);
        if (row && !row.cover_url) row.cover_url = p.url;
      }
      listings = Array.from(map.values());
    }

    // Сортируем как в favorites
    const order = new Map<string, number>();
    (favs ?? []).forEach((f, i) => order.set(f.listing_id, i));
    listings.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return NextResponse.json({ rows: listings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
