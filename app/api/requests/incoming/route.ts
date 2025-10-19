// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type BookingRow = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;
  renter_id: string | null;   // заявитель
  owner_id: string | null;    // владелец объявления (вы)
  chat_id: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки на мои -> bookings_incoming
    const { data: bookings, error } = await sb
      .from('bookings_incoming')
      .select(
        [
          'id',
          'status',
          'payment_status',
          'start_date',
          'end_date',
          'monthly_price',
          'deposit',
          'created_at',
          'listing_id',
          'renter_id',
          'owner_id',
          'chat_id',
        ].join(',')
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }

    const rows = (bookings ?? []) as unknown as BookingRow[];

    // 2) инфо по объявлениям
    const listingIds: string[] = [];
    for (const b of rows) if (b.listing_id) listingIds.push(b.listing_id);
    const uniqListingIds = Array.from(new Set(listingIds));

    let listingTitle = new Map<string, { title: string | null; city: string | null }>();
    if (uniqListingIds.length) {
      const { data: listings } = await sb
        .from('listings')
        .select('id,title,city')
        .in('id', uniqListingIds);
      for (const l of listings ?? []) {
        listingTitle.set(l.id, { title: l.title ?? null, city: l.city ?? null });
      }
    }

    // 3) обложки
    let cover = new Map<string, string>();
    if (uniqListingIds.length) {
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', uniqListingIds)
        .order('sort_order', { ascending: true });

      for (const p of photos ?? []) {
        if (!cover.has(p.listing_id)) cover.set(p.listing_id, p.url ?? '');
      }
    }

    // для фронта «Заявки на мои» сохраним поле renter_id_for_chat
    const result = rows.map((b) => ({
      ...b,
      listing_title: b.listing_id ? listingTitle.get(b.listing_id)?.title ?? null : null,
      listing_city: b.listing_id ? listingTitle.get(b.listing_id)?.city ?? null : null,
      cover_url: b.listing_id ? cover.get(b.listing_id) ?? null : null,
      renter_id_for_chat: b.renter_id, // ← используется кнопкой "Открыть чат"
    }));

    return NextResponse.json({ rows: result });
  } catch (e: any) {
    return NextResponse.json(
      { error: true, message: e?.message || 'internal_error' },
      { status: 500 }
    );
  }
}
