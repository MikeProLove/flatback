// app/api/chats/threads/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    const { data: bookings, error: be } = await sb
      .from('booking_requests')
      .select('id, listing_id, owner_id, tenant_id, created_at')
      .or(`owner_id.eq.${userId},tenant_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (be) {
      return NextResponse.json({ error: 'db', message: be.message }, { status: 500 });
    }

    const br = bookings ?? [];
    if (br.length === 0) {
      return NextResponse.json({ threads: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const bookingIds = br.map((b: any) => b.id);
    const listingIds = Array.from(new Set(br.map((b: any) => b.listing_id).filter(Boolean)));

    const { data: lst } = await sb
      .from('listings_with_cover')
      .select('id,title,city,cover_url')
      .in('id', listingIds);

    const listingMap = new Map<string, { title: string|null; city: string|null; cover_url: string|null }>();
    (lst ?? []).forEach((l: any) => {
      listingMap.set(String(l.id), { title: l.title ?? null, city: l.city ?? null, cover_url: l.cover_url ?? null });
    });

    const { data: msgs } = await sb
      .from('messages')
      .select('id, booking_id, sender_id, recipient_id, body, created_at, read_at')
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false })
      .limit(2000);

    const lastByBooking = new Map<string, any>();
    const unreadCount = new Map<string, number>();
    for (const m of (msgs ?? [])) {
      const bid = String(m.booking_id);
      if (!lastByBooking.has(bid)) lastByBooking.set(bid, m);
      if (m.recipient_id === userId && !m.read_at) {
        unreadCount.set(bid, (unreadCount.get(bid) ?? 0) + 1);
      }
    }

    const threads = br.map((b: any) => {
      const bid = String(b.id);
      const last = lastByBooking.get(bid) || null;
      const meta = listingMap.get(String(b.listing_id)) || { title: null, city: null, cover_url: null };
      const other_id = userId === b.owner_id ? b.tenant_id : b.owner_id;
      return {
        booking_id: bid,
        listing_id: b.listing_id as string | null,
        other_id: other_id as string | null,
        last_message: last
          ? { body: last.body as string, created_at: last.created_at as string, sender_id: last.sender_id as string }
          : null,
        unread: unreadCount.get(bid) ?? 0,
        listing_title: meta.title,
        listing_city: meta.city,
        cover_url: meta.cover_url,
        created_at: b.created_at as string,
      };
    });

    threads.sort((a, b) => {
      const ta = a.last_message ? +new Date(a.last_message.created_at) : +new Date(a.created_at);
      const tb = b.last_message ? +new Date(b.last_message.created_at) : +new Date(b.created_at);
      return tb - ta;
    });

    return NextResponse.json({ threads }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('[threads] GET', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
