// app/api/requests/mine/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type MineViewRow = {
  id: string;
  listing_id: string | null;
  user_id: string; // заявитель (вы)
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  title: string | null; // из listings
  city: string | null;  // из listings
  cover_url: string | null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) тянем мои заявки из вьюхи
    const q = await sb
      .from('bookings_mine_view')
      .select(
        'id, listing_id, user_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, title, city, cover_url'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (q.error) {
      return NextResponse.json(
        { error: 'db_error', message: q.error.message },
        { status: 500 }
      );
    }

    const rows = (q.data ?? []) as MineViewRow[];

    // 2) подтянем владельцев объявлений, чтобы найти существующие чаты
    //    (owner = coalesce(listings.owner_id, listings.user_id))
    const listingOwners = new Map<string, string>();
    const listingIds: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const lid = rows[i].listing_id;
      if (lid && listingOwners.has(lid) === false) listingIds.push(lid);
    }

    if (listingIds.length) {
      const lq = await sb
        .from('listings')
        .select('id, owner_id, user_id')
        .in('id', listingIds);

      if (!lq.error && lq.data) {
        for (let i = 0; i < lq.data.length; i++) {
          const rec = lq.data[i] as any;
          const owner = rec.owner_id || rec.user_id;
          if (rec.id && owner) listingOwners.set(rec.id, owner);
        }
      }
    }

    // 3) загрузим чаты по парам (listing_id + participant = текущий пользователь)
    const chatByListing = new Map<string, string>();
    if (listingIds.length) {
      const cq = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .eq('participant_id', userId)
        .in('listing_id', listingIds);

      if (!cq.error && cq.data) {
        for (let i = 0; i < cq.data.length; i++) {
          const c = cq.data[i] as any;
          if (c.listing_id && !chatByListing.has(c.listing_id)) {
            chatByListing.set(c.listing_id, c.id);
          }
        }
      }
    }

    // 4) финальный ответ в формате, который ждёт фронт
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

      // для кнопки чата: если чата нет — фронт покажет кнопку "Открыть чат" без otherId
      chat_id: r.listing_id ? (chatByListing.get(r.listing_id) || null) : null,
    }));

    return NextResponse.json({ rows: out });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
