// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) какие объявления мои
    const { data: myListings } = await sb
      .from('listings')
      .select('id,title,city')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

    const ids = (myListings ?? []).map(l => l.id);
    if (!ids.length) return NextResponse.json({ rows: [] });

    // 2) заявки на эти объявления
    const { data: bookings, error } = await sb
      .from('bookings')
      .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,renter_id')
      .in('listing_id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    // 3) обложки
    let covers = new Map<string, string>();
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing_id', ids)
      .order('sort_order', { ascending: true });

    (photos ?? []).forEach(p => {
      if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url || '');
    });

    // 4) уже созданные чаты между мной (владельцем) и арендаторами
    const { data: chats } = await sb
      .from('chats')
      .select('id,listing_id,owner_id,participant_id')
      .in('listing_id', ids);

    // key: listing_id + renter_id → chat_id
    const chatKey = (lid: string, rid: string) => `${lid}::${rid}`;
    const chatMap = new Map<string, string>();
    (chats ?? []).forEach(c => {
      if (c.owner_id === userId) chatMap.set(chatKey(c.listing_id, c.participant_id), c.id);
    });

    const meta = new Map(myListings!.map(l => [l.id, l]));

    const rows = (bookings ?? []).map(b => ({
      id: b.id,
      status: b.status,
      payment_status: b.payment_status,
      start_date: b.start_date,
      end_date: b.end_date,
      monthly_price: b.monthly_price,
      deposit: b.deposit,
      created_at: b.created_at,
      listing_id: b.listing_id,
      listing_title: b.listing_id ? meta.get(b.listing_id)?.title ?? null : null,
      listing_city: b.listing_id ? meta.get(b.listing_id)?.city ?? null : null,
      cover_url: b.listing_id ? (covers.get(b.listing_id) || null) : null,
      renter_id_for_chat: b.renter_id,         // ← с кем открыть чат
      chat_id: b.listing_id && b.renter_id ? (chatMap.get(chatKey(b.listing_id, b.renter_id)) || null) : null,
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
