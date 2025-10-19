// app/api/requests/mine/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Booking = {
  id: string;
  listing_id: string | null;
  status: string | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  renter_id?: string | null; // может не существовать в схеме
  user_id?: string | null;   // может не существовать в схеме
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // --- 1) пробуем по renter_id ---
    const qRenter = await sb
      .from('bookings')
      .select(
        'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, renter_id, user_id'
      )
      .eq('renter_id', userId)
      .order('created_at', { ascending: false });

    let bookings: Booking[] = [];

    if (qRenter.error && /column .*renter_id.* does not exist/i.test(qRenter.error.message)) {
      // --- 2) схема без renter_id → fallback по user_id ---
      const qUser = await sb
        .from('bookings')
        .select(
          'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, user_id'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (qUser.error) {
        return NextResponse.json(
          { error: 'db_error', message: qUser.error.message },
          { status: 500 }
        );
      }
      bookings = (qUser.data ?? []) as unknown as Booking[];
    } else if (qRenter.error) {
      return NextResponse.json(
        { error: 'db_error', message: qRenter.error.message },
        { status: 500 }
      );
    } else {
      bookings = (qRenter.data ?? []) as unknown as Booking[];
    }

    if (!bookings.length) {
      return NextResponse.json({ rows: [] });
    }

    // --- 3) инфо по объявлениям ---
    const listingIds = Array.from(
      new Set(bookings.map((b) => b.listing_id).filter(Boolean))
    ) as string[];

    const { data: listings } = await sb
      .from('listings')
      .select('id, title, city, owner_id, user_id')
      .in('id', listingIds);

    const listingMap = new Map((listings ?? []).map((l) => [l.id, l] as const));

    // --- 4) обложки ---
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });

    const coverMap = new Map<string, string>();
    (photos ?? []).forEach((p: any) => {
      if (p.url && !coverMap.has(p.listing_id)) coverMap.set(p.listing_id, p.url);
    });

    // --- 5) ответ ---
    const rows = bookings.map((b) => {
      const L = b.listing_id ? listingMap.get(b.listing_id) : null;
      return {
        id: b.id,
        status: b.status ?? 'pending',
        payment_status: b.payment_status ?? 'pending',
        start_date: b.start_date,
        end_date: b.end_date,
        monthly_price: b.monthly_price ?? 0,
        deposit: b.deposit,
        created_at: b.created_at,

        listing_id: b.listing_id,
        listing_title: L?.title ?? null,
        listing_city: L?.city ?? null,
        cover_url: b.listing_id ? coverMap.get(b.listing_id) ?? null : null,

        // собеседник — владелец объявления
        other_id_for_chat: L?.owner_id || L?.user_id || null,

        chat_id: null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'internal' },
      { status: 500 }
    );
  }
}
