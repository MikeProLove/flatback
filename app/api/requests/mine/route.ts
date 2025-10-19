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
  owner_id: string | null;   // владелец объявления
  user_id?: string | null;   // текущий—арендатор; можно не запрашивать, но пусть будет
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Все мои заявки (я — арендатор)
    const { data: bookingsData, error: bErr } = await sb
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
          'owner_id',
          'user_id',
        ].join(',')
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json(
        { error: 'db_error', message: bErr.message },
        { status: 500 }
      );
    }

    const rowsRaw: any[] = Array.isArray(bookingsData) ? bookingsData : [];
    if (rowsRaw.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    // 2) Собираем id объявлений (без Set, чтобы не требовать downlevelIteration)
    const listingIds: string[] = [];
    for (const r of rowsRaw) {
      const lid = r?.listing_id;
      if (typeof lid === 'string' && lid && !listingIds.includes(lid)) {
        listingIds.push(lid);
      }
    }

    // 3) Информация по объявлениям (title/city/cover)
    const listingInfo = new Map<
      string,
      { title: string | null; city: string | null; cover_url: string | null }
    >();

    // пробуем вьюху с cover_url
    if (listingIds.length) {
      const { data: lwc, error: lwcErr } = await sb
        .from('listings_with_cover')
        .select('id,title,city,cover_url')
        .in('id', listingIds);

      if (!lwcErr && Array.isArray(lwc)) {
        for (const l of lwc) {
          listingInfo.set(l.id, {
            title: l?.title ?? null,
            city: l?.city ?? null,
            cover_url: l?.cover_url ?? null,
          });
        }
      }
    }

    // фоллбэк для отсутствующих cover_url — достанем первый файл из storage
    for (const r of rowsRaw) {
      const lid: string | null = r?.listing_id ?? null;
      if (!lid) continue;
      const have = listingInfo.get(lid);
      if (have && have.cover_url) continue;

      // нужен владелец для пути к storage; берём из брони
      const ownerId: string | null = r?.owner_id ?? null;
      let coverUrl: string | null = null;

      if (ownerId) {
        const prefix = `${ownerId}/${lid}`;
        const listed = await sb.storage.from('listings').list(prefix, { limit: 1 });
        const first = listed?.data?.[0];
        if (first) {
          const path = `${prefix}/${first.name}`;
          coverUrl = sb.storage.from('listings').getPublicUrl(path).data.publicUrl;
        }
      }

      listingInfo.set(lid, {
        title: have?.title ?? null,
        city: have?.city ?? null,
        cover_url: coverUrl,
      });
    }

    // 4) Чаты: для арендатора participant_id = userId, ищем по listing_id
    let chatMapByListing = new Map<string, string>(); // listing_id -> chat_id (с моим участием)
    if (listingIds.length) {
      const { data: chatsData } = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .in('listing_id', listingIds)
        .eq('participant_id', userId);

      for (const c of chatsData ?? []) {
        if (c?.listing_id && !chatMapByListing.has(c.listing_id)) {
          chatMapByListing.set(c.listing_id, c.id);
        }
      }
    }

    // 5) Ответ для UI
    const result = rowsRaw.map((r: any) => {
      const lid: string | null = r?.listing_id ?? null;
      const info = lid ? listingInfo.get(lid) : undefined;
      const chat_id = lid ? (chatMapByListing.get(lid) ?? null) : null;

      const monthly_price_num = Number(r?.monthly_price);
      const monthly_price = Number.isFinite(monthly_price_num) ? monthly_price_num : 0;

      return {
        id: String(r.id),
        status: r.status as BookingRow['status'],
        payment_status: r.payment_status as BookingRow['payment_status'],
        start_date: r.start_date ?? null,
        end_date: r.end_date ?? null,
        monthly_price,
        deposit: r.deposit ?? null,
        created_at: String(r.created_at),

        listing_id: lid,
        listing_title: info?.title ?? null,
        listing_city: info?.city ?? null,
        cover_url: info?.cover_url ?? null,

        // для кнопки "Открыть чат" (если чата нет — сервер создаст)
        owner_id_for_chat: r?.owner_id ?? null,
        chat_id,
      };
    });

    return NextResponse.json({ rows: result });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
