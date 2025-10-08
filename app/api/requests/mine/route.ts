// app/api/requests/mine/route.ts
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
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) мои заявки (как арендатор). У тебя колонка пользователя в bookings — user_id
    const { data: bookings, error } = await sb
      .from('bookings')
      .select(
        'id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'db_error', message: error.message },
        { status: 500 }
      );
    }

    // 2) id объявлений без Set-спреда (исправление ошибки компиляции)
    const listingIds = Array.from(
      new Set(
        (bookings ?? [])
          .map((b) => b.listing_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0)
      )
    );

    // 3) заголовок/город/владелец объявлений
    let metaById = new Map<
      string,
      { title: string | null; city: string | null; owner_id: string | null }
    >();

    if (listingIds.length) {
      const { data: listings } = await sb
        .from('listings')
        .select('id,title,city,owner_id,user_id')
        .in('id', listingIds);

      (listings ?? []).forEach((l: any) => {
        metaById.set(l.id, {
          title: l.title ?? null,
          city: l.city ?? null,
          owner_id: (l.owner_id || l.user_id) ?? null,
        });
      });
    }

    // 4) обложки: первая фотка по sort_order
    let coverByListing = new Map<string, string>();
    if (listingIds.length) {
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });

      (photos ?? []).forEach((p: any) => {
        if (!coverByListing.has(p.listing_id) && p.url) {
          coverByListing.set(p.listing_id, p.url);
        }
      });
    }

    // 5) ответ
    const rows = (bookings ?? []).map((b) => {
      const meta = b.listing_id ? metaById.get(b.listing_id) : undefined;
      return {
        id: b.id,
        status: b.status,
        payment_status: b.payment_status,
        start_date: b.start_date,
        end_date: b.end_date,
        monthly_price: b.monthly_price,
        deposit: b.deposit,
        created_at: b.created_at,
        listing_id: b.listing_id,
        listing_title: meta?.title ?? null,
        listing_city: meta?.city ?? null,
        cover_url: b.listing_id ? coverByListing.get(b.listing_id) ?? null : null,
        // чтобы открыть чат со стороны арендатора — нужен владелец объявления:
        owner_id_for_chat: meta?.owner_id ?? null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
