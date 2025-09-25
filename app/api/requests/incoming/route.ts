// app/api/requests/incoming/route.ts
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

    // Заявки, где я владелец
    const { data: bookings, error: bErr } = await sb
      .from('booking_requests')
      .select(
        'id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,owner_id,tenant_id'
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (bErr) return NextResponse.json({ error: 'db', message: bErr.message }, { status: 500 });

    const rows = bookings ?? [];
    const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))] as string[];

    // Информация по объявлениям
    const listingMap = new Map<string, { title: string | null; city: string | null }>();
    if (listingIds.length) {
      const { data: listings } = await sb
        .from('listings')
        .select('id,title,city')
        .in('id', listingIds);
      (listings ?? []).forEach((l) => {
        listingMap.set(l.id, { title: l.title ?? null, city: l.city ?? null });
      });
    }

    // Обложки (первая фотка)
    const coverMap = new Map<string, string>();
    if (listingIds.length) {
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order,created_at')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      for (const p of photos ?? []) {
        if (!coverMap.has(p.listing_id)) coverMap.set(p.listing_id, p.url);
      }
    }

    const out = rows.map((r) => ({
      ...r,
      listing_title: r.listing_id ? listingMap.get(r.listing_id)?.title ?? null : null,
      listing_city: r.listing_id ? listingMap.get(r.listing_id)?.city ?? null : null,
      cover_url: r.listing_id ? coverMap.get(r.listing_id) ?? null : null,
    }));

    return NextResponse.json({ rows: out }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('[requests/incoming] GET', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
