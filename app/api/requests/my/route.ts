// app/api/requests/my/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Возвращает заявки текущего пользователя (как арендатора),
 * плюс данные объявления (title/city/cover) и owner_id_for_chat.
 */
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) Заявки пользователя (название полей может отличаться, поэтому используем OR по двум возможным полям)
  const reqRes = await sb
    .from('bookings')
    .select(
      [
        'id',
        'created_at',
        'status',
        'payment_status',
        'start_date',
        'end_date',
        'monthly_price',
        'deposit',
        'listing_id',
      ].join(',')
    )
    .or(`renter_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (reqRes.error) {
    return NextResponse.json({ error: 'db_error', message: reqRes.error.message }, { status: 500 });
  }
  const rows = (reqRes.data ?? []) as any[];

  // 2) Соберём уникальные listing_id без Set/spread (совместимо со старым target)
  const listingIds: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const lid = rows[i]?.listing_id as string | null;
    if (lid && listingIds.indexOf(lid) === -1) listingIds.push(lid);
  }

  // 3) Подтянем объявления (владелец, заголовок, город)
  const listingMap: Record<
    string,
    { id: string; owner_id: string | null; user_id: string | null; title: string | null; city: string | null }
  > = {};
  if (listingIds.length > 0) {
    const lRes = await sb
      .from('listings')
      .select('id, owner_id, user_id, title, city')
      .in('id', listingIds);
    const listings = (lRes.data ?? []) as any[];
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i];
      listingMap[l.id] = {
        id: l.id,
        owner_id: l.owner_id ?? null,
        user_id: l.user_id ?? null,
        title: l.title ?? null,
        city: l.city ?? null,
      };
    }
  }

  // 4) Первая фотка как cover
  const covers: Record<string, string> = {};
  if (listingIds.length > 0) {
    const pRes = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });
    const photos = (pRes.data ?? []) as any[];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const lid = p.listing_id as string;
      if (covers[lid] === undefined && p.url) covers[lid] = p.url as string;
    }
  }

  // 5) Сформируем результат + owner_id_for_chat
  const out = rows.map((r) => {
    const l = r.listing_id ? listingMap[r.listing_id] : null;
    const ownerIdForChat = l ? (l.owner_id || l.user_id) : null;
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      payment_status: r.payment_status,
      start_date: r.start_date,
      end_date: r.end_date,
      monthly_price: r.monthly_price,
      deposit: r.deposit,
      listing_id: r.listing_id,
      listing_title: l ? l.title : null,
      listing_city: l ? l.city : null,
      cover_url: r.listing_id ? (covers[r.listing_id] ?? null) : null,
      owner_id_for_chat: ownerIdForChat,
    };
  });

  return NextResponse.json({ rows: out });
}
