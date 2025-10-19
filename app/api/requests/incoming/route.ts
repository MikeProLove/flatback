// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Row = {
  id: string;
  listing_id: string | null;
  status: string;
  payment_status: string;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  renter_id: string;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки, где текущий — владелец объявления
    const q = await sb
      .from('bookings_base')
      .select(
        'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, renter_id'
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (q.error) {
      return NextResponse.json({ error: 'db_error', message: q.error.message }, { status: 500 });
    }

    const rows = (q.data ?? []) as Row[];

    // 2) инфо по объявлениям
    const ids: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const lid = rows[i].listing_id;
      if (lid && ids.indexOf(lid) === -1) ids.push(lid);
    }

    const listingMap = new Map<
      string,
      { title: string | null; city: string | null }
    >();

    if (ids.length) {
      const lq = await sb.from('listings').select('id, title, city').in('id', ids);
      const L = lq.data ?? [];
      for (let i = 0; i < L.length; i++) {
        listingMap.set(L[i].id, { title: L[i].title ?? null, city: L[i].city ?? null });
      }
    }

    // 3) обложки
    const covers = new Map<string, string>();
    for (let i = 0; i < ids.length; i++) {
      const lid = ids[i];
      const ph = await sb
        .from('listing_photos')
        .select('url')
        .eq('listing_id', lid)
        .order('sort_order', { ascending: true })
        .limit(1);
      const u = ph.data?.[0]?.url;
      if (u) covers.set(lid, u);
    }

    const res = rows.map((r) => ({
      ...r,
      listing_title: r.listing_id ? (listingMap.get(r.listing_id)?.title ?? null) : null,
      listing_city: r.listing_id ? (listingMap.get(r.listing_id)?.city ?? null) : null,
      cover_url: r.listing_id ? (covers.get(r.listing_id) ?? null) : null,
      renter_id_for_chat: r.renter_id,
    }));

    return NextResponse.json({ rows: res });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
