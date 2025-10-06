// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Booking = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number;
  deposit: number;
  created_at: string;
  listing_id: string | null;
  owner_id: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки на мои объявления
    const { data: bookings, error: bErr } = await sb
      .from('bookings')
      .select(
        'id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,owner_id'
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    const rows: Booking[] = (bookings ?? []) as any[];

    // 2) список listing_id без Set/итераторов ES2015
    const rawIds: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i].listing_id;
      if (typeof v === 'string') rawIds.push(v);
    }
    const listingIds: string[] = [];
    for (let i = 0; i < rawIds.length; i++) {
      const v = rawIds[i];
      if (listingIds.indexOf(v) === -1) listingIds.push(v);
    }

    // 3) данные по объявлениям
    const listingMap: Record<string, { title: string | null; city: string | null }> = {};
    if (listingIds.length) {
      const { data: lrows } = await sb
        .from('listings')
        .select('id,title,city')
        .in('id', listingIds);

      const l = (lrows ?? []) as Array<{ id: string; title: string | null; city: string | null }>;
      for (let i = 0; i < l.length; i++) {
        listingMap[l[i].id] = { title: l[i].title, city: l[i].city };
      }
    }

    // 4) cover-изображение (первая фотка)
    const coverMap: Record<string, string> = {};
    if (listingIds.length) {
      const { data: ph } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order,created_at')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      const photos = (ph ?? []) as Array<{ listing_id: string; url: string }>;
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (!coverMap[p.listing_id]) coverMap[p.listing_id] = p.url;
      }
    }

    // 5) объединяем
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const info = r.listing_id ? listingMap[r.listing_id] : undefined;
      out.push({
        ...r,
        listing_title: info ? info.title : null,
        listing_city: info ? info.city : null,
        cover_url: r.listing_id ? coverMap[r.listing_id] || null : null,
      });
    }

    return NextResponse.json({ rows: out }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal_error' }, { status: 500 });
  }
}
