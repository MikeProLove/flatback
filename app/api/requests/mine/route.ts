// app/api/requests/mine/route.ts
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

    // 1) тянем заявки текущего пользователя из bookings (или fallback в bookings_base)
    async function loadFrom(table: 'bookings' | 'bookings_base') {
      return sb
        .from(table)
        .select('id, listing_id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    }

    let resp = await loadFrom('bookings');
    if (resp.error && /relation .*bookings.* does not exist/i.test(resp.error.message)) {
      resp = await loadFrom('bookings_base');
    }
    if (resp.error) {
      return NextResponse.json({ error: resp.error.message }, { status: 500 });
    }
    const rows = resp.data || [];

    // 2) подтянем данные объявлений
    const listingIds = Array.from(new Set(rows.map((r: any) => r.listing_id).filter(Boolean)));
    let listingMap = new Map<string, { title: string | null; city: string | null; owner: string | null; user: string | null }>();
    if (listingIds.length) {
      const L = await sb
        .from('listings')
        .select('id, title, city, owner_id, user_id')
        .in('id', listingIds);
      (L.data || []).forEach((x: any) =>
        listingMap.set(x.id, { title: x.title ?? null, city: x.city ?? null, owner: x.owner_id ?? null, user: x.user_id ?? null })
      );
    }

    // 3) обложки (первая фото из listing_photos)
    let coverMap = new Map<string, string>();
    if (listingIds.length) {
      const P = await sb
        .from('listing_photos')
        .select('listing_id, url, sort_order, id')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });
      for (const p of P.data || []) {
        const lid = p.listing_id as string;
        if (!coverMap.has(lid) && p.url) coverMap.set(lid, p.url);
      }
    }

    // 4) подставим chat_path (если чат есть)
    const items = [];
    for (const b of rows) {
      const linfo = listingMap.get(b.listing_id) || { title: null, city: null, owner: null, user: null };
      const ownerId = (linfo.owner || linfo.user) as string | null;
      let chatId: string | null = null;
      if (ownerId) {
        const c = await sb
          .from('chats')
          .select('id')
          .eq('listing_id', b.listing_id)
          .eq('owner_id', ownerId)
          .eq('participant_id', userId)
          .maybeSingle();
        if (c.data?.id) chatId = c.data.id;
      }

      items.push({
        id: b.id,
        listing_id: b.listing_id,
        title: linfo.title,
        city: linfo.city,
        cover_url: coverMap.get(b.listing_id) || null,
        start_date: b.start_date,
        end_date: b.end_date,
        monthly_price: b.monthly_price,
        deposit: b.deposit,
        status: b.status,
        payment_status: b.payment_status,
        chat_id: chatId,
        chat_path: chatId ? `/chat/${chatId}` : null,
        other_id: ownerId,
      });
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 });
  }
}
