// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) мои объявления
  const lRes = await sb
    .from('listings')
    .select('id, owner_id, user_id, title, city')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);
  if (lRes.error) {
    return NextResponse.json({ error: 'db_error', message: lRes.error.message }, { status: 500 });
  }
  const listings = (lRes.data ?? []) as any[];
  const myIds: string[] = listings.map((l) => l.id);

  if (!myIds.length) return NextResponse.json({ rows: [] });

  const listingInfo: Record<string, { title: string | null; city: string | null }> = {};
  listings.forEach((l) => (listingInfo[l.id] = { title: l.title ?? null, city: l.city ?? null }));

  // 2) заявки по моим объявлениям (берём * — без привязки к конкретным именам колонок)
  const bRes = await sb
    .from('bookings')
    .select('*')
    .in('listing_id', myIds)
    .order('created_at', { ascending: false });
  if (bRes.error) {
    return NextResponse.json({ error: 'db_error', message: bRes.error.message }, { status: 500 });
  }
  const bookings = (bRes.data ?? []) as any[];

  // 3) covers
  const covers: Record<string, string> = {};
  const pRes = await sb
    .from('listing_photos')
    .select('listing_id, url, sort_order')
    .in('listing_id', myIds)
    .order('sort_order', { ascending: true });
  if (!pRes.error) {
    const photos = (pRes.data ?? []) as any[];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const lid = p.listing_id as string;
      if (covers[lid] === undefined && p.url) covers[lid] = p.url as string;
    }
  }

  // 4) существующие чаты: owner = я
  const cRes = await sb
    .from('chats')
    .select('id, listing_id, owner_id, participant_id')
    .eq('owner_id', userId)
    .in('listing_id', myIds);
  const chatMap = new Map<string, string>(); // key: `${listing_id}|${participant_id}` -> chat_id
  if (!cRes.error) {
    const chats = (cRes.data ?? []) as any[];
    for (let i = 0; i < chats.length; i++) {
      const ch = chats[i];
      chatMap.set(`${ch.listing_id}|${ch.participant_id}`, ch.id);
    }
  }

  // 5) собираем ответ
  const rows = bookings.map((b) => {
    const lid = b.listing_id as string | null;
    const info = lid ? listingInfo[lid] : null;

    // кто арендатор в записи заявки
    const renterId: string | null = (b.renter_id as string) || (b.user_id as string) || null;

    // если чат уже существует
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
