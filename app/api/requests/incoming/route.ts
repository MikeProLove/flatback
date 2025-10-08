// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function detectRenterColumn(sb: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await sb
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'bookings');

  if (error) return null;
  const names = new Set((data ?? []).map((r: any) => r.column_name as string));
  const candidates = [
    'renter_id',
    'user_id',
    'created_by',
    'created_by_user_id',
    'author_id',
    'applicant_id',
    'client_id',
  ];
  for (const c of candidates) if (names.has(c)) return c;
  return null;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) мои объявления
  const L = await sb
    .from('listings')
    .select('id, owner_id, user_id, title, city')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

  if (L.error) return NextResponse.json({ error: 'db_error', message: L.error.message }, { status: 500 });

  const listings = (L.data ?? []) as any[];
  const myIds = listings.map((l) => l.id);
  if (!myIds.length) return NextResponse.json({ rows: [] });

  const listingInfo: Record<string, { title: string | null; city: string | null }> = {};
  listings.forEach((l) => (listingInfo[l.id] = { title: l.title ?? null, city: l.city ?? null }));

  // 2) заявки по моим объявлениям
  const B = await sb.from('bookings').select('*').in('listing_id', myIds).order('created_at', { ascending: false });
  if (B.error) return NextResponse.json({ error: 'db_error', message: B.error.message }, { status: 500 });
  const bookings = (B.data ?? []) as any[];

  // 3) какая колонка — арендатор
  const renterCol = await detectRenterColumn(sb);

  // 4) обложки
  const covers: Record<string, string> = {};
  const P = await sb
    .from('listing_photos')
    .select('listing_id, url, sort_order')
    .in('listing_id', myIds)
    .order('sort_order', { ascending: true });
  if (!P.error) {
    for (const p of (P.data ?? []) as any[]) {
      const lid = p.listing_id as string;
      if (covers[lid] === undefined && p.url) covers[lid] = p.url as string;
    }
  }

  // 5) существующие чаты (владелец — я)
  const C = await sb
    .from('chats')
    .select('id, listing_id, owner_id, participant_id')
    .eq('owner_id', userId)
    .in('listing_id', myIds);

  const chatMap = new Map<string, string>(); // `${listing_id}|${participant_id}` -> chat_id
  if (!C.error) {
    for (const ch of (C.data ?? []) as any[]) {
      chatMap.set(`${ch.listing_id}|${ch.participant_id}`, ch.id);
    }
  }

  // 6) ответ
  const rows = bookings.map((b) => {
    const lid = b.listing_id as string | null;
    const info = lid ? listingInfo[lid] : null;

    // определяем ID арендатора из подходящей колонки
    const renterId: string | null = renterCol ? (b[renterCol] as string | null) ?? null : null;

    const chatId = renterId && lid ? chatMap.get(`${lid}|${renterId}`) ?? null : null;

    return {
      id: b.id,
      created_at: b.created_at,
      status: b.status,
      payment_status: b.payment_status,
      start_date: b.start_date,
      end_date: b.end_date,
      monthly_price: b.monthly_price ?? b.price ?? 0,
      deposit: b.deposit ?? null,
      listing_id: lid,
      listing_title: info?.title ?? null,
      listing_city: info?.city ?? null,
      cover_url: lid ? (covers[lid] ?? null) : null,
      renter_id_for_chat: renterId,
      chat_id: chatId,
    };
  });

  return NextResponse.json({ rows });
}
