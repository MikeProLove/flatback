// app/api/requests/mine/route.ts
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
  user_id: string | null; // текущий пользователь (заявитель)
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

    // 1) Тянем заявки текущего пользователя: сначала из bookings, если её нет — из bookings_base
    const loadFrom = (table: 'bookings' | 'bookings_base') =>
      sb
        .from(table)
        .select(
          'id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, user_id'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    let bookingsQ = await loadFrom('bookings');
    if (bookingsQ.error && /relation .*bookings.* does not exist/i.test(bookingsQ.error.message)) {
      bookingsQ = await loadFrom('bookings_base');
    }
    const bookings: BookingRow[] = (bookingsQ.data ?? []) as any;

    if (bookings.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 2) Собираем id объявлений
    const listingIds: string[] = [];
    for (let i = 0; i < bookings.length; i++) {
      const lid = bookings[i].listing_id;
      if (lid) listingIds.push(lid);
    }

    // 3) Информация по объявлениям (title/city/owner)
    const infoMap = new Map<string, ListingRow>();
    if (listingIds.length > 0) {
      const infoQ = await sb
        .from('listings')
        .select('id, title, city, owner_id, user_id')
        .in('id', listingIds);
      const listingInfo: ListingRow[] = (infoQ.data ?? []) as any;
      for (let i = 0; i < listingInfo.length; i++) {
        const li = listingInfo[i];
        infoMap.set(li.id, li);
      }
    }

    // 4) Обложки: первая фотка из listing_photos (если таблица есть)
    const coverMap = new Map<string, string>();
    if (listingIds.length > 0) {
      try {
        const photosQ = await sb
          .from('listing_photos')
          .select('listing_id, url, sort_order')
          .in('listing_id', listingIds)
          .order('sort_order', { ascending: true });
        const photos: PhotoRow[] = (photosQ.data ?? []) as any;
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (!p.url) continue;
          if (!coverMap.has(p.listing_id)) coverMap.set(p.listing_id, p.url);
        }
      } catch {
        // таблицы нет — без обложек
      }
    }

    // 5) Существующие чаты: для "моих заявок" участник = я (participant_id = userId)
    //    Достаточно ключа (listing_id, participant_id), owner_id дернём из listingInfo
    const chatMap = new Map<string, string>(); // key: `${listing_id}:${participant_id}` -> chat_id
    if (listingIds.length > 0) {
      const chatsQ = await sb
        .from('chats')
        .select('id, listing_id, participant_id')
        .eq('participant_id', userId)
        .in('listing_id', listingIds);
      const chats: ChatRow[] = (chatsQ.data ?? []) as any;
      for (let i = 0; i < chats.length; i++) {
        const ch = chats[i];
        const key = `${ch.listing_id}:${ch.participant_id}`;
        if (ch.id) chatMap.set(key, ch.id);
      }
    }

    // 6) Сбор результата
    const items = [];
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const info = b.listing_id ? infoMap.get(b.listing_id) : undefined;
      const cover = b.listing_id ? coverMap.get(b.listing_id) ?? null : null;

      const ownerId = info ? (info.owner_id || info.user_id) : null; // владелец объявления
      const chatKey = `${b.listing_id}:${userId}`;
      const chatId = chatMap.get(chatKey) ?? null;

      items.push({
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
        other_id: ownerId, // для кнопки "Открыть чат" можно пробросить владельца
      });
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
