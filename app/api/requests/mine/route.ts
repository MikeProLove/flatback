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
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;
  user_id: string | null; // кто подал заявку (арендатор)
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Берём заявки текущего пользователя из VIEW bookings
    const { data: bookings, error } = await sb
      .from('bookings')
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
          'user_id', // ← это и есть "арендатор"
        ].join(',')
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    const rows = (bookings ?? []) as BookingRow[];

    // 2) Собираем id объявлений
    const listingIds: string[] = [];
    for (const r of rows) {
      if (r.listing_id && !listingIds.includes(r.listing_id)) listingIds.push(r.listing_id);
    }

    // 3) Подтягиваем инфо по объявлениям (заголовок/город/владелец/обложка)
    let listingInfo = new Map<
      string,
      { title: string | null; city: string | null; owner_id: string | null; cover_url: string | null }
    >();

    if (listingIds.length) {
      // сначала пробуем вьюху с cover_url
      const { data: lwc } = await sb
        .from('listings_with_cover')
        .select('id,title,city,owner_id,cover_url')
        .in('id', listingIds);

      if (lwc && lwc.length) {
        for (const l of lwc) {
          listingInfo.set(l.id, {
            title: l.title ?? null,
            city: l.city ?? null,
            owner_id: l.owner_id ?? null,
            cover_url: l.cover_url ?? null,
          });
        }
      } else {
        // фоллбэк: обычные listings + первый файл из storage
        const { data: ls } = await sb
          .from('listings')
          .select('id,title,city,owner_id')
          .in('id', listingIds);

        for (const l of ls ?? []) {
          let cover: string | null = null;
          const prefix = `${l.owner_id ?? ''}/${l.id}`;
          const listed = await sb.storage.from('listings').list(prefix, { limit: 1 });
          const first = listed?.data?.[0];
          if (first) {
            const path = `${prefix}/${first.name}`;
            cover = sb.storage.from('listings').getPublicUrl(path).data.publicUrl;
          }
          listingInfo.set(l.id, {
            title: l.title ?? null,
            city: l.city ?? null,
            owner_id: l.owner_id ?? null,
            cover_url: cover,
          });
        }
      }
    }

    // 4) Склеиваем ответ под UI
    const result = rows.map((r) => {
      const info = r.listing_id ? listingInfo.get(r.listing_id) : undefined;
      return {
        id: r.id,
        status: r.status,
        payment_status: r.payment_status,
        start_date: r.start_date,
        end_date: r.end_date,
        monthly_price: Number(r.monthly_price) || 0,
        deposit: r.deposit,
        created_at: r.created_at,
        listing_id: r.listing_id,
        listing_title: info?.title ?? null,
        listing_city: info?.city ?? null,
        cover_url: info?.cover_url ?? null,
        owner_id: info?.owner_id ?? null, // для открытия чата с владельцем
      };
    });

    return NextResponse.json({ rows: result });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
