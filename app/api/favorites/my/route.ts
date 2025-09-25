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

    const ids = (favs ?? []).map((f) => f.listing_id);
    if (!ids.length) return NextResponse.json({ rows: [] });

    // берём из вьюхи, чтобы была обложка; если вьюха ломалась — можно заменить на listings + подсос фото
    const { data: listings, error: lErr } = await sb
      .from('listings_with_cover')
      .select('id,title,price,city,rooms,area_total,cover_url,created_at')
      .in('id', ids);

    if (lErr) return NextResponse.json({ error: 'db', message: lErr.message }, { status: 500 });

    // сохраняем порядок по created_at в избранном
    const order = new Map<string, number>();
    (favs ?? []).forEach((f, idx) => order.set(f.listing_id, idx));
    const rows = (listings ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('[favorites/my] GET', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
