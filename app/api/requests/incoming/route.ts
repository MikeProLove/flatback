// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type IncomingViewRow = {
  id: string;
  listing_id: string | null;
  renter_id: string | null; // кто отправил заявку
  owner_id: string | null;  // владелец объявления
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  title: string | null;
  city: string | null;
  cover_url: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки на мои объявления
    const q = await sb
      .from('bookings_incoming_view')
      .select(
        'id, listing_id, renter_id, owner_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, title, city, cover_url'
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (q.error) {
      return NextResponse.json(
        { error: 'db_error', message: q.error.message },
        { status: 500 }
      );
    }

    const rows = (q.data ?? []) as IncomingViewRow[];

    // 2) найдём существующие чаты по парам (listing_id + renter_id)
    //    (в чатах owner_id = вы, participant_id = renter_id)
    const pairs: Array<{ listing_id: string; renter_id: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.listing_id && r.renter_id) {
        pairs.push({ listing_id: r.listing_id, renter_id: r.renter_id });
      }
    }

    const chatByKey = new Map<string, string>(); // key = `${listing_id}|${renter_id}`
    if (pairs.length) {
      // соберём уникальные listing_id и participant_id для IN-фильтров
      const listingIds: string[] = [];
      const renterIds: string[] = [];
      const listingSeen: Record<string, 1> = {};
      const renterSeen: Record<string, 1> = {};

      for (let i = 0; i < pairs.length; i++) {
        const a = pairs[i];
        if (!listingSeen[a.listing_id]) {
          listingIds.push(a.listing_id);
          listingSeen[a.listing_id] = 1;
        }
        if (!renterSeen[a.renter_id]) {
          renterIds.push(a.renter_id);
          renterSeen[a.renter_id] = 1;
        }
      }

      const cq = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .eq('owner_id', userId)
        .in('listing_id', listingIds)
        .in('participant_id', renterIds);

      if (!cq.error && cq.data) {
        for (let i = 0; i < cq.data.length; i++) {
          const c = cq.data[i] as any;
          const key = `${c.listing_id}|${c.participant_id}`;
          if (!chatByKey.has(key)) chatByKey.set(key, c.id);
        }
      }
    }

    // 3) ответ в формате страницы
    const out = rows.map((r) => ({
      id: r.id,
      listing_id: r.listing_id,
      status: r.status,
      payment_status: r.payment_status,
      start_date: r.start_date,
      end_date: r.end_date,
      monthly_price: r.monthly_price ?? 0,
      deposit: r.deposit,
      created_at: r.created_at,

      listing_title: r.title,
      listing_city: r.city,
      cover_url: r.cover_url,

      renter_id_for_chat: r.renter_id,
      chat_id:
        r.listing_id && r.renter_id
          ? chatByKey.get(`${r.listing_id}|${r.renter_id}`) || null
          : null,
    }));

    return NextResponse.json({ rows: out });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
