// app/api/requests/mine/route.ts
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

  // чтобы открыть чат с владельцем:
  other_user_id: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ rows: [] });

    const sb = getSupabaseAdmin();

    // 1) Берём все мои брони (как заявитель). Не трогаем названия колонок — берём '*'
    const { data: bookingsData, error: e1 } = await sb
      .from('bookings')
      .select('*')
      // поддерживаем обе возможные схемы: renter_id ИЛИ user_id
      .or(`renter_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (e1) {
      return NextResponse.json(
        { error: 'db_error', message: e1.message },
        { status: 500 },
      );
    }

    const bookings = (bookingsData as unknown as any[]) ?? [];

    // 2) Собираем listing_id
    const listingIds: string[] = [];
    for (const b of bookings) {
      if (b.listing_id) listingIds.push(b.listing_id);
    }
    const uniqListingIds = Array.from(new Set(listingIds));
    let listingMap = new Map<string, { title: string | null; city: string | null; owner_id: string | null; user_id: string | null }>();
    let coverMap = new Map<string, string>();

    if (uniqListingIds.length) {
      // 3) Титул/город/владелец
      const { data: listings } = await sb
        .from('listings')
        .select('id,title,city,owner_id,user_id')
        .in('id', uniqListingIds);

      for (const l of listings ?? []) {
        listingMap.set(l.id, {
          title: l.title ?? null,
          city: l.city ?? null,
          owner_id: l.owner_id ?? null,
          user_id: l.user_id ?? null,
        });
      }

      // 4) Обложки (первое фото по sort_order)
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', uniqListingIds)
        .order('sort_order', { ascending: true });

      for (const p of photos ?? []) {
        if (!coverMap.has(p.listing_id) && p.url) coverMap.set(p.listing_id, p.url);
      }
    }

    // 5) Проецируем в удобный вид
    const rows: OutRow[] = bookings.map((b) => {
      const L = listingMap.get(b.listing_id) ?? { title: null, city: null, owner_id: null, user_id: null };
      const ownerId = L.owner_id || L.user_id || null; // владелец объявления — наш собеседник
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

        other_user_id: ownerId,
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
