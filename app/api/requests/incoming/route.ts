// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type OutRow = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;

  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;

  // чтобы открыть чат с арендатором:
  other_user_id: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ rows: [] });

    const sb = getSupabaseAdmin();

    // 1) Находим ВСЕ мои объявления (owner_id или user_id = я)
    const { data: myListings, error: eL } = await sb
      .from('listings')
      .select('id,title,city,owner_id,user_id')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

    if (eL) {
      return NextResponse.json(
        { error: 'db_error', message: eL.message },
        { status: 500 },
      );
    }

    const listingIds = (myListings ?? []).map((l) => l.id);
    if (!listingIds.length) return NextResponse.json({ rows: [] });

    // Карты для быстрого доступа
    const listingMap = new Map<string, { title: string | null; city: string | null }>();
    for (const l of myListings ?? []) {
      listingMap.set(l.id, { title: l.title ?? null, city: l.city ?? null });
    }

    // 2) Берём все бронирования по этим объявлениям
    const { data: bookingsData, error: eB } = await sb
      .from('bookings')
      .select('*')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (eB) {
      return NextResponse.json(
        { error: 'db_error', message: eB.message },
        { status: 500 },
      );
    }

    const bookings = (bookingsData as unknown as any[]) ?? [];

    // 3) Обложки (по всем объявлениям сразу)
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });

    const coverMap = new Map<string, string>();
    for (const p of photos ?? []) {
      if (!coverMap.has(p.listing_id) && p.url) coverMap.set(p.listing_id, p.url);
    }

    // 4) Проецируем
    const rows: OutRow[] = bookings.map((b) => {
      const L = listingMap.get(b.listing_id) ?? { title: null, city: null };
      const renterId: string | null = b.renter_id ?? b.user_id ?? null; // поддержка обеих схем
      return {
        id: String(b.id),
        status: b.status ?? 'pending',
        payment_status: b.payment_status ?? 'pending',
        start_date: b.start_date ?? null,
        end_date: b.end_date ?? null,
        monthly_price: b.monthly_price ?? null,
        deposit: b.deposit ?? null,
        created_at: b.created_at,
        listing_id: b.listing_id ?? null,

        listing_title: L.title,
        listing_city: L.city,
        cover_url: coverMap.get(b.listing_id ?? '') ?? null,

        other_user_id: renterId,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 },
    );
  }
}
