export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function tryFetchIncoming(sb: any, userId: string) {
  // пробуем найти заявки по owner_id в таблице bookings
  const candidates = ['owner_id', 'landlord_id'];
  for (const col of candidates) {
    const r = await sb
      .from('bookings')
      .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id')
      .eq(col, userId)
      .order('created_at', { ascending: false });
    if (!r.error) return r.data ?? [];
  }
  // если колонок нет — берём все букинги по объявлениям, где пользователь владелец
  const { data: listings } = await sb
    .from('listings')
    .select('id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);
  const ids = (listings ?? []).map((x: any) => x.id);
  if (!ids.length) return [];
  const all = await sb
    .from('bookings')
    .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id')
    .in('listing_id', ids)
    .order('created_at', { ascending: false });
  if (all.error) throw all.error;
  return all.data ?? [];
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  try {
    const bookings = await tryFetchIncoming(sb, userId);

    const listingIds = Array.from(new Set((bookings ?? []).map((b: any) => b.listing_id).filter(Boolean)));

    // мета + кто подал заявку (renter)
    let renterByBooking = new Map<string, string | null>();
    // пробуем разные варианты названия колонки арендатора
    const renterCols = ['renter_id', 'user_id', 'created_by', 'applicant_id'];
    for (const col of renterCols) {
      const r = await sb
        .from('bookings')
        .select(`id, ${col}`)
        .in('id', (bookings ?? []).map((x: any) => x.id));
      if (!r.error) {
        (r.data ?? []).forEach((x: any) => renterByBooking.set(x.id, x[col] ?? null));
        break;
      }
    }

    const { data: L } = listingIds.length
      ? await sb.from('listings').select('id,title,city').in('id', listingIds)
      : { data: [] as any[] };

    const meta = new Map<string, { title: string | null; city: string | null }>();
    (L ?? []).forEach((x: any) => meta.set(x.id, { title: x.title, city: x.city }));

    // обложки
    let covers = new Map<string, string>();
    if (listingIds.length) {
      const { data: ph } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });
      (ph ?? []).forEach((p: any) => { if (!covers.has(p.listing_id) && p.url) covers.set(p.listing_id, p.url); });
    }

    // существующие чаты (где owner — текущий пользователь)
    let byListingChat = new Map<string, string>();
    if (listingIds.length) {
      const { data: ch } = await sb
        .from('chats')
        .select('id,listing_id,owner_id,participant_id')
        .in('listing_id', listingIds)
        .eq('owner_id', userId);
      (ch ?? []).forEach((c: any) => byListingChat.set(c.listing_id, c.id));
    }

    const rows = (bookings ?? []).map((b: any) => {
      const m = meta.get(b.listing_id) || { title: null, city: null };
      return {
        ...b,
        listing_title: m.title,
        listing_city: m.city,
        cover_url: covers.get(b.listing_id) || null,
        chat_id: byListingChat.get(b.listing_id) || null,
        renter_id_for_chat: renterByBooking.get(b.id) || null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'load_failed' }, { status: 500 });
  }
}
