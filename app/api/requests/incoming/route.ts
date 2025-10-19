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
  listing_id: string;
  renter_id: string | null; // заявитель
  owner_id: string | null;  // владелец (вы)
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) заявки на мои (я — владелец объявления)
    const { data: bookings, error } = await sb
      .from('v_requests_incoming')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (bookings ?? []) as unknown as BookingRow[];

    // 2) id объявлений
    const listingIds: string[] = [];
    for (const r of rows) if (r.listing_id) listingIds.push(r.listing_id);

    // 3) заголовок/город
    let listingInfo = new Map<string, { title: string | null; city: string | null }>();
    if (listingIds.length) {
      const { data: listings } = await sb
        .from('listings')
        .select('id,title,city')
        .in('id', listingIds);

      for (const l of listings ?? []) {
        listingInfo.set(l.id, { title: l.title ?? null, city: l.city ?? null });
      }
    }

    // 4) обложки
    let covers = new Map<string, string>();
    if (listingIds.length) {
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });

      for (const p of photos ?? []) {
        if (!covers.has(p.listing_id) && p.url) covers.set(p.listing_id, p.url);
      }
    }

    // 5) уже созданные чаты по этим заявкам
    let chatByKey = new Map<string, string>(); // key = listing_id + '|' + renter_id
    if (listingIds.length) {
      const { data: chats } = await sb
        .from('chats')
        .select('id, listing_id, owner_id, participant_id')
        .eq('owner_id', userId)
        .in('listing_id', listingIds);

      for (const c of chats ?? []) {
        chatByKey.set(`${c.listing_id}|${c.participant_id}`, c.id);
      }
    }

    const result = rows.map((r) => {
      const meta = listingInfo.get(r.listing_id) ?? { title: null, city: null };
      const chat_id = r.renter_id ? chatByKey.get(`${r.listing_id}|${r.renter_id}`) ?? null : null;

      return {
        id: r.id,
        status: r.status,
        payment_status: r.payment_status,
        start_date: r.start_date,
        end_date: r.end_date,
        monthly_price: r.monthly_price,
        deposit: r.deposit,
        created_at: r.created_at,
        listing_id: r.listing_id,
        listing_title: meta.title,
        listing_city: meta.city,
        cover_url: covers.get(r.listing_id) ?? null,
        renter_id_for_chat: r.renter_id, // <- кому отвечать
        chat_id
      };
    });

    return NextResponse.json({ rows: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status: 500 });
  }
}
