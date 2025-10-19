// app/api/requests/incoming/route.ts
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
  user_id: string | null; // арендатор (тот, кто подал заявку)
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Мои объявления (я владелец)
    const { data: myListings, error: listErr } = await sb
      .from('listings')
      .select('id')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

    if (listErr) {
      return NextResponse.json({ error: 'db_error', message: listErr.message }, { status: 500 });
    }

    const listingIds: string[] = [];
    for (const l of myListings ?? []) {
      if (l.id && !listingIds.includes(l.id)) listingIds.push(l.id);
    }
    if (listingIds.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    // 2) Все заявки на мои объявления
    const { data: bookings, error: bErr } = await sb
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
          'user_id',
        ].join(',')
      )
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json({ error: 'db_error', message: bErr.message }, { status: 500 });
    }

    const rows = (bookings ?? []) as BookingRow[];

    // 3) Информация по объявлениям (title/city/cover)
    let listingInfo = new Map<
      string,
      { title: string | null; city: string | null; cover_url: string | null }
    >();

    {
      const { data: lwc } = await sb
        .from('listings_with_cover')
        .select('id,title,city,cover_url')
        .in('id', listingIds);

      if (lwc && lwc.length) {
        for (const l of lwc) {
          listingInfo.set(l.id, {
            title: l.title ?? null,
            city: l.city ?? null,
            cover_url: l.cover_url ?? null,
          });
        }
      } else {
        // фоллбэк по storage
        for (const lid of listingIds) {
          let cover: string | null = null;
          // владельца можно не искать: путь строили из owner/id, но для простоты пробуем без owner
          // (если нужно — отдельно подтянуть owner_id из listings)
          const { data: oneL } = await sb.from('listings').select('owner_id').eq('id', lid).maybeSingle();
          const prefix = `${oneL?.owner_id ?? ''}/${lid}`;
          const listed = await sb.storage.from('listings').list(prefix, { limit: 1 });
          const first = listed?.data?.[0];
          if (first) {
            const path = `${prefix}/${first.name}`;
            cover = sb.storage.from('listings').getPublicUrl(path).data.publicUrl;
          }
          const { data: meta } = await sb.from('listings').select('title,city').eq('id', lid).maybeSingle();
          listingInfo.set(lid, {
            title: meta?.title ?? null,
            city: meta?.city ?? null,
            cover_url: cover,
          });
        }
      }
    }

    // 4) Подтянем id чатов владелец↔арендатор по конкретному объявлению
    // По нашей логике owner чата = владелец объявления
    const renters: string[] = [];
    for (const r of rows) {
      const uid = r.user_id;
      if (uid && !renters.includes(uid)) renters.push(uid);
    }

    let chatMap = new Map<string, string>(); // key: `${listing_id}__${participant_id}` -> chat_id
    {
      const { data: chats } = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .in('listing_id', listingIds)
        .eq('owner_id', userId);

      for (const c of chats ?? []) {
        const key = `${c.listing_id}__${c.participant_id}`;
        chatMap.set(key, c.id);
      }
    }

    // 5) Склеиваем ответ под UI «Заявки на мои»
    const result = rows.map((r) => {
      const info = r.listing_id ? listingInfo.get(r.listing_id) : undefined;
      const renter = r.user_id ?? null; // ← участник чата, «арендатор»
      const chat_id = r.listing_id && renter ? chatMap.get(`${r.listing_id}__${renter}`) ?? null : null;

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

        renter_id_for_chat: renter, // чтобы кнопка "Открыть чат" работала
        chat_id,
      };
    });

    return NextResponse.json({ rows: result });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
