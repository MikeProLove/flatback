// app/api/requests/mine/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Row = {
  id: string;
  listing_id: string | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;

  // для фронта
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;

  // чтобы открыть чат с владельцем
  owner_id_for_chat: string | null;
  chat_id: string | null;
};

function isMissingColumn(err?: { message?: string | null }) {
  const m = err?.message || '';
  return /column .* does not exist|relation .* does not exist/i.test(m);
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Тянем брони пользователя (арендатора).
    // Сначала пробуем через стабильную вьюху bookings_user_view (поле renter_id),
    // если её/поля нет — падаем на bookings.user_id.
    let bookings: any[] = [];
    let q1 = await sb
      .from('bookings_user_view' as any)
      .select(
        'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, renter_id'
      )
      .eq('renter_id', userId);

    if (q1.error && isMissingColumn(q1.error)) {
      // fallback на сырую таблицу/вьюху bookings c user_id
      const q2 = await sb
        .from('bookings' as any)
        .select(
          'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, user_id'
        )
        .eq('user_id', userId);
      if (q2.error) {
        return NextResponse.json({ error: 'db_error', message: q2.error.message }, { status: 500 });
      }
      bookings = q2.data ?? [];
    } else if (q1.error) {
      return NextResponse.json({ error: 'db_error', message: q1.error.message }, { status: 500 });
    } else {
      bookings = q1.data ?? [];
    }

    if (!bookings.length) {
      return NextResponse.json({ rows: [] as Row[] });
    }

    // 2) Собираем id объявлений
    const listingIds = Array.from(
      new Set(
        (bookings as any[])
          .map((b) => b?.listing_id)
          .filter((x): x is string => !!x)
      )
    );

    // 3) Информация по объявлениям (title/city/owner + первая фотка)
    const [listingsRes, photosRes] = await Promise.all([
      sb
        .from('listings' as any)
        .select('id, title, city, owner_id, user_id')
        .in('id', listingIds),
      sb
        .from('listing_photos' as any)
        .select('listing_id, url, sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true }),
    ]);

    const listings = (listingsRes.data ?? []) as any[];
    const photos = (photosRes.data ?? []) as any[];

    const listingById = new Map<string, any>();
    for (const l of listings) listingById.set(l.id, l);

    const coverByListing = new Map<string, string>();
    for (const p of photos) {
      const lid = p?.listing_id as string | undefined;
      if (lid && !coverByListing.has(lid) && p?.url) {
        coverByListing.set(lid, p.url as string);
      }
    }

    // 4) Сборка ответа
    const rows: Row[] = (bookings as any[]).map((b) => {
      const l = b?.listing_id ? listingById.get(b.listing_id) : null;
      const owner = l?.owner_id || l?.user_id || null;

      return {
        id: String(b.id),
        listing_id: b.listing_id ?? null,
        status: (b.status || 'pending') as Row['status'],
        payment_status: (b.payment_status || 'pending') as Row['payment_status'],
        start_date: b.start_date ?? null,
        end_date: b.end_date ?? null,
        monthly_price: typeof b.monthly_price === 'number' ? b.monthly_price : null,
        deposit: typeof b.deposit === 'number' ? b.deposit : null,
        created_at: b.created_at ?? new Date().toISOString(),

        listing_title: l?.title ?? null,
        listing_city: l?.city ?? null,
        cover_url: b.listing_id ? coverByListing.get(b.listing_id) ?? null : null,

        owner_id_for_chat: owner ?? null,
        chat_id: null, // если чат уже создан и вы храните chat_id у booking — сюда можно подставить
      };
    });

    // Сортировка по дате создания убыв.
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
