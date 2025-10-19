// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function uniq<T>(arr: T[]) {
  const s = new Set<T>(); const out: T[] = [];
  for (const x of arr) if (!s.has(x)) { s.add(x); out.push(x); }
  return out;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) Мои объявления (учитываем owner_id и старое user_id)
  const { data: myListings } = await sb
    .from('listings')
    .select('id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

  const myListingIds = uniq((myListings ?? []).map(l => l.id));
  if (!myListingIds.length) return NextResponse.json({ rows: [] });

  // 2) Все заявки по этим объявлениям
  const { data: bookings } = await sb
    .from('bookings')
    .select('id, status, payment_status, start_date, end_date, monthly_price, deposit, created_at, listing_id, user_id') // user_id может и не быть — ок, игнорим
    .in('listing_id', myListingIds)
    .order('created_at', { ascending: false });

  // 3) Заголовок/город
  const { data: listingInfo } = await sb
    .from('listings')
    .select('id, title, city')
    .in('id', myListingIds);

  const infoMap = new Map<string, { title: string | null; city: string | null }>();
  (listingInfo ?? []).forEach(l => infoMap.set(l.id, { title: l.title ?? null, city: l.city ?? null }));

  // 4) Обложки
  const covers = new Map<string, string>();
  const { data: photos } = await sb
    .from('listing_photos')
    .select('listing_id, url, sort_order')
    .in('listing_id', myListingIds)
    .order('sort_order', { ascending: true });
  (photos ?? []).forEach(p => { if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url ?? ''); });

  // 5) Собираем ответ
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
    listing_title: infoMap.get(b.listing_id ?? '')?.title ?? null,
    listing_city: infoMap.get(b.listing_id ?? '')?.city ?? null,
    cover_url: covers.get(b.listing_id ?? '') ?? null,
    renter_id_for_chat: b.user_id ?? null, // если колонки нет/NULL — кнопка чата не появится
  }));

  return NextResponse.json({ rows });
}
