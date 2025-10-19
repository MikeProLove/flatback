// app/api/requests/mine/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) Берём мои бронирования (я — заявитель)
  const { data: bookings, error } = await sb
    .from('bookings')
    .select('id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, listing_id')
    .eq('user_id', userId) // <-- если у вас другое имя колонки – поменяйте тут один раз
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const listingIds = Array.from(new Set((bookings ?? []).map(b => b.listing_id).filter(Boolean))) as string[];

  // 2) Подтягиваем объявления
  const { data: listings } = await sb
    .from('listings')
    .select('id, title, city, owner_id, user_id')
    .in('id', listingIds);

  const listMap = new Map<string, { title: string | null; city: string | null; owner: string | null }>();
  (listings ?? []).forEach(l => {
    listMap.set(l.id, { title: l.title ?? null, city: l.city ?? null, owner: (l.owner_id || l.user_id) ?? null });
  });

  // 3) Обложки
  let covers = new Map<string, string>();
  if (listingIds.length) {
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });
    (photos ?? []).forEach(p => {
      if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url ?? '');
    });
  }

  // 4) chat_id (ищем по связке listing + {владелец, я})
  const chatIdByListing = new Map<string, string>();
  for (const lid of listingIds) {
    const owner = listMap.get(lid)?.owner;
    if (!owner) continue;
    const { data: chat } = await sb
      .from('chats')
      .select('id')
      .eq('listing_id', lid)
      .eq('owner_id', owner)
      .eq('participant_id', userId)
      .maybeSingle();
    if (chat?.id) chatIdByListing.set(lid, chat.id);
  }

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
    listing_title: listMap.get(b.listing_id ?? '')?.title ?? null,
    listing_city: listMap.get(b.listing_id ?? '')?.city ?? null,
    cover_url: covers.get(b.listing_id ?? '') ?? null,
    chat_id: chatIdByListing.get(b.listing_id ?? '') ?? null,
  }));

  return NextResponse.json({ rows });
}
