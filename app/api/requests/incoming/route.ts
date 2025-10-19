// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type RowOut = {
  id: string;
  status: 'pending'|'approved'|'declined'|'cancelled';
  payment_status: 'pending'|'paid'|'refunded';
  start_date: string|null;
  end_date: string|null;
  monthly_price: number|null;
  deposit: number|null;
  created_at: string;
  listing_id: string;

  listing_title: string|null;
  listing_city: string|null;
  cover_url: string|null;

  renter_id_for_chat: string|null; // собеседник = заявитель
  chat_id: string|null;
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки на мои (я = владелец)
    const q = await sb
      .from('bookings_unified')
      .select('id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, renter_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (q.error) {
      return NextResponse.json({ error: 'db_error', message: q.error.message }, { status: 500 });
    }

    const rows = q.data ?? [];
    const listingIds = Array.from(new Set(rows.map(r => r.listing_id).filter(Boolean)));

    // 2) инфо по объявлениям
    const { data: listings } = await sb
      .from('listings')
      .select('id, title, city')
      .in('id', listingIds.length ? listingIds : ['-']);

    const listingMap = new Map((listings ?? []).map(l => [l.id, { title: l.title as string|null, city: l.city as string|null }]));

    // 3) обложки
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds.length ? listingIds : ['-'])
      .order('sort_order', { ascending: true });

    const coverMap = new Map<string, string>();
    for (const p of photos ?? []) {
      if (!coverMap.has(p.listing_id) && p.url) coverMap.set(p.listing_id, p.url);
    }

    // 4) существующие чаты (owner = userId, participant = renter_id)
    let existingChats = new Map<string, string>();
    if (rows.length) {
      const { data: chats } = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .eq('owner_id', userId)
        .in('listing_id', listingIds.length ? listingIds : ['-']);
      for (const c of chats ?? []) {
        const key = `${c.listing_id}:${c.owner_id}:${c.participant_id}`;
        existingChats.set(key, c.id);
      }
    }

    const out: RowOut[] = rows.map(r => {
      const lm = listingMap.get(r.listing_id);
      const renterId = (r as any).renter_id as string | null;
      const chatKey = renterId ? `${r.listing_id}:${userId}:${renterId}` : '';
      return {
        id: r.id,
        status: r.status as any,
        payment_status: r.payment_status as any,
        start_date: r.start_date,
        end_date: r.end_date,
        monthly_price: r.monthly_price,
        deposit: r.deposit,
        created_at: r.created_at,
        listing_id: r.listing_id,
        listing_title: lm?.title ?? null,
        listing_city: lm?.city ?? null,
        cover_url: coverMap.get(r.listing_id) ?? null,
        renter_id_for_chat: renterId,
        chat_id: chatKey ? (existingChats.get(chatKey) ?? null) : null,
      };
    });

    return NextResponse.json({ rows: out });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
