// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type BookingRow = {
  id: string;
  listing_id: string | null;
  status: string | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  user_id: string | null; // заявитель (арендатор)
};

type ListingRow = {
  id: string;
  title: string | null;
  city: string | null;
  owner_id: string | null;
  user_id: string | null;
};

type PhotoRow = {
  listing_id: string;
  url: string | null;
  sort_order: number | null;
};

type ChatRow = {
  id: string;
  listing_id: string | null;
  owner_id: string | null;
  participant_id: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Мои объявления (я — владелец)
    const myListingsResp = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`);
    const myListings: ListingRow[] = (myListingsResp.data ?? []) as any;

    const listingIds = myListings.map((l) => l.id).filter(Boolean);
    if (listingIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 2) Заявки по этим объявлениям (bookings → bookings_base фоллбэк)
    const loadFrom = async (table: 'bookings' | 'bookings_base') =>
      sb
        .from(table)
        .select(
          'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, user_id'
        )
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });

    let bookingsQ = await loadFrom('bookings');
    if (bookingsQ.error && /relation .*bookings.* does not exist/i.test(bookingsQ.error.message)) {
      bookingsQ = await loadFrom('bookings_base');
    }
    const bookings: BookingRow[] = (bookingsQ.data ?? []) as any;

    if (bookings.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 3) Справочники: инфо по объявлениям и обложки
    const infoQ = await sb
      .from('listings')
      .select('id, title, city, owner_id, user_id')
      .in('id', listingIds);
    const listingInfo: ListingRow[] = (infoQ.data ?? []) as any;
    const infoMap = new Map<string, ListingRow>();
    for (const li of listingInfo) infoMap.set(li.id, li);

    // cover_url: попробуем через listing_photos (если есть таблица)
    let coverMap = new Map<string, string>();
    try {
      const photosQ = await sb
        .from('listing_photos')
        .select('listing_id, url, sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });
      const photos: PhotoRow[] = (photosQ.data ?? []) as any;
      for (const p of photos) {
        if (!p.url) continue;
        if (!coverMap.has(p.listing_id)) coverMap.set(p.listing_id, p.url);
      }
    } catch {
      // если таблицы нет — просто оставим карты пустыми
    }

    // 4) Сопоставим существующие чаты (владелец = я, участник = заявитель)
    const renterIds = Array.from(
      new Set(bookings.map((b) => b.user_id).filter(Boolean) as string[])
    );
    let chatMap = new Map<string, string>(); // key: `${listing_id}:${participant_id}` -> chat_id
    if (renterIds.length) {
      const chatsQ = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .eq('owner_id', userId)
        .in('listing_id', listingIds)
        .in('participant_id', renterIds);
      const chats: ChatRow[] = (chatsQ.data ?? []) as any;
      for (const ch of chats) {
        const key = `${ch.listing_id}:${ch.participant_id}`;
        if (ch.id) chatMap.set(key, ch.id);
      }
    }

    // 5) Сбор результата
    const items = bookings.map((b) => {
      const info = b.listing_id ? infoMap.get(b.listing_id) : undefined;
      const cover = b.listing_id ? coverMap.get(b.listing_id) ?? null : null;
      const otherId = b.user_id || null; // арендатор (заявитель)
      const chatId =
        b.listing_id && otherId ? chatMap.get(`${b.listing_id}:${otherId}`) ?? null : null;

      return {
        id: b.id,
        listing_id: b.listing_id,
        title: info?.title ?? null,
        city: info?.city ?? null,
        cover_url: cover,
        start_date: b.start_date,
        end_date: b.end_date,
        monthly_price: b.monthly_price,
        deposit: b.deposit,
        status: b.status,
        payment_status: b.payment_status,
        chat_id: chatId,
        chat_path: chatId ? `/chat/${chatId}` : null,
        other_id: otherId,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
