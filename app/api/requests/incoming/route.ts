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
  user_id: string | null; // арендатор (кто подал заявку)
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) мои объявления (я владелец)
    const { data: myListingsData, error: listErr } = await sb
      .from('listings')
      .select('id')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

    if (listErr) {
      return NextResponse.json(
        { error: 'db_error', message: listErr.message },
        { status: 500 }
      );
    }

    const listingIds = (Array.isArray(myListingsData) ? myListingsData : [])
      .map((l: any) => l?.id)
      .filter(Boolean) as string[];

    if (listingIds.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    // 2) все заявки на мои объявления
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
          'user_id',
        ].join(',')
      )
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (bErr) {
      return NextResponse.json(
        { error: 'db_error', message: bErr.message },
        { status: 500 }
      );
    }

    const rows: BookingRow[] = Array.isArray(bookingsData) ? (bookingsData as any) : [];

    // 3) инфо по объявлениям (title/city/cover)
    const listingInfo = new Map<
      string,
      { title: string | null; city: string | null; cover_url: string | null }
    >();

    // сперва пробуем вьюху с cover_url
    const { data: lwc, error: lwcErr } = await sb
      .from('listings_with_cover')
      .select('id,title,city,cover_url')
      .in('id', listingIds);

    if (!lwcErr && Array.isArray(lwc) && lwc.length) {
      for (const l of lwc) {
        listingInfo.set(l.id, {
          title: l.title ?? null,
          city: l.city ?? null,
          cover_url: l.cover_url ?? null,
        });
      }
    } else {
      // фоллбэк: достаём title/city и первую фотку из storage
      for (const lid of listingIds) {
        // кто владелец — чтобы собрать storage путь
        const { data: meta } = await sb
          .from('listings')
          .select('title,city,owner_id')
          .eq('id', lid)
          .maybeSingle();

        let cover: string | null = null;
        if (meta?.owner_id) {
          const prefix = `${meta.owner_id}/${lid}`;
          const listed = await sb.storage.from('listings').list(prefix, { limit: 1 });
          const first = listed?.data?.[0];
          if (first) {
            const path = `${prefix}/${first.name}`;
            cover = sb.storage.from('listings').getPublicUrl(path).data.publicUrl;
          }
        }

        listingInfo.set(lid, {
          title: meta?.title ?? null,
          city: meta?.city ?? null,
          cover_url: cover,
        });
      }
    }

    // 4) чаты по паре (listing_id + participant_id), где owner = текущий пользователь
    const { data: chatsData } = await sb
      .from('chats')
      .select('id, listing_id, owner_id, participant_id')
      .in('listing_id', listingIds)
      .eq('owner_id', userId);

    const chatMap = new Map<string, string>(); // `${listing_id}__${participant_id}` -> chat_id
    for (const c of chatsData ?? []) {
      chatMap.set(`${c.listing_id}__${c.participant_id}`, c.id);
    }

    // 5) ответ для UI
    const result = rows.map((r) => {
      const info = r.listing_id ? listingInfo.get(r.listing_id) : undefined;
      const renter = r.user_id ?? null;
      const chat_id =
        r.listing_id && renter ? chatMap.get(`${r.listing_id}__${renter}`) ?? null : null;

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

        renter_id_for_chat: renter,
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
