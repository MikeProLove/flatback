// app/api/requests/incoming/route.ts
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
  renter_id?: string | null;
  user_id?: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Находим все мои объявления (я — владелец)
    const { data: myListings, error: lerr } = await sb
      .from('listings')
      .select('id')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
      .limit(1000);

    if (lerr) {
      return NextResponse.json(
        { error: 'db_error', message: lerr.message },
        { status: 500 }
      );
    }

    const listingIds = (myListings ?? []).map((x) => x.id);
    if (!listingIds.length) {
      return NextResponse.json({ rows: [] });
    }

    // 2) Берём заявки по этим объявлениям
    let q = await sb
      .from('bookings')
      .select(
        'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, renter_id, user_id'
      )
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (q.error) {
      return NextResponse.json(
        { error: 'db_error', message: q.error.message },
        { status: 500 }
      );
    }

    const bookings = (q.data ?? []) as Booking[];
    if (!bookings.length) {
      return NextResponse.json({ rows: [] });
    }

    // 3) Подтягиваем краткую инфо объявления
    const { data: listings } = await sb
      .from('listings')
      .select('id, title, city')
      .in('id', listingIds);

    const listingMap = new Map(
      (listings ?? []).map((l) => [l.id, l] as const)
    );

    // 4) Обложки
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });

    const coverMap = new Map<string, string>();
    (photos ?? []).forEach((p) => {
      if (p.url && !coverMap.has(p.listing_id)) coverMap.set(p.listing_id, p.url);
    });

    // 5) Ответ для владельца: собеседник — заявитель (renter_id | user_id)
    const rows = bookings.map((b) => {
      const L = b.listing_id ? listingMap.get(b.listing_id) : null;
      const renter =
        (b as any).renter_id ?? (b as any).user_id ?? null;

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
        renter_id_for_chat: renter, // ← нужен для кнопки чата
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
