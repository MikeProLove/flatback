// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Booking = Record<string, any>;
const getRenterId = (b: Booking) => {
  for (const k of ['renter_id', 'user_id', 'created_by', 'author_id', 'customer_id']) {
    if (k in b && typeof b[k] === 'string' && b[k]) return b[k] as string;
  }
  return null;
};

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  const { data: bookingsRaw, error: eB } = await sb
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (eB) return NextResponse.json({ error: eB.message }, { status: 500 });

  const listingIds = Array.from(new Set((bookingsRaw ?? []).map(b => b.listing_id).filter(Boolean))) as string[];

  const { data: listings } = await sb
    .from('listings')
    .select('id,title,city,owner_id,user_id')
    .in('id', listingIds.length ? listingIds : ['00000000-0000-0000-0000-000000000000']);

  const byId = new Map<string, any>((listings ?? []).map(l => [l.id, l]));

  // Оставляем только брони по моим объявлениям
  const mine = (bookingsRaw ?? []).filter(b => {
    const l = byId.get(b.listing_id);
    const owner = l?.owner_id || l?.user_id || null;
    return owner === userId;
  });

  const { data: photos } = await sb
    .from('listing_photos')
    .select('listing_id,url,sort_order')
    .in('listing_id', Array.from(new Set(mine.map(b => b.listing_id))) as string[])
    .order('sort_order', { ascending: true });

  const firstPhoto = new Map<string, string>();
  (photos ?? []).forEach(p => {
    if (!firstPhoto.has(p.listing_id) && p.url) firstPhoto.set(p.listing_id, p.url);
  });

  const rows = mine.map(b => {
    const l = byId.get(b.listing_id) || {};
    const renter = getRenterId(b);

    return {
      id: b.id,
      status: b.status ?? 'pending',
      payment_status: b.payment_status ?? 'pending',
      start_date: b.start_date ?? null,
      end_date: b.end_date ?? null,
      monthly_price: Number(b.monthly_price ?? 0),
      deposit: b.deposit ?? null,
      created_at: b.created_at,
      listing_id: b.listing_id ?? null,
      listing_title: l.title ?? null,
      listing_city: l.city ?? null,
      cover_url: firstPhoto.get(b.listing_id) ?? null,

      // для владельца мне нужен арендатор
      renter_id_for_chat: renter,
      chat_id: b.chat_id ?? null,
    };
  });

  return NextResponse.json({ rows });
}
