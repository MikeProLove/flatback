// app/api/chats/my/route.ts
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

  // 1) забираем чаты пользователя (без join'ов — максимально совместимо)
  const chatsRes = await sb
    .from('chats')
    .select('id, created_at, listing_id, owner_id, participant_id, last_message_at, last_message_preview')
    .or(`owner_id.eq.${userId},participant_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (chatsRes.error) {
    return NextResponse.json({ error: 'db_error', message: chatsRes.error.message }, { status: 500 });
  }
  const chats = (chatsRes.data ?? []) as any[];

  // 2) собираем уникальные listing_id без Set/спреда
  const listingIds: string[] = [];
  for (let i = 0; i < chats.length; i++) {
    const lid = chats[i]?.listing_id as string | null;
    if (lid && listingIds.indexOf(lid) === -1) listingIds.push(lid);
  }

  // 3) подтянем заголовки/города объявлений
  const listingMap: Record<string, { id: string; title: string | null; city: string | null }> = {};
  if (listingIds.length > 0) {
    const listingsRes = await sb
      .from('listings')
      .select('id, title, city')
      .in('id', listingIds);
    const listings = (listingsRes.data ?? []) as any[];
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i];
      listingMap[l.id] = { id: l.id, title: l.title ?? null, city: l.city ?? null };
    }
  }

  // 4) обложки (первая фотка по sort_order)
  const covers: Record<string, string> = {};
  if (listingIds.length > 0) {
    const photosRes = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });

    const photos = (photosRes.data ?? []) as any[];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const lid = p.listing_id as string;
      if (covers[lid] === undefined && p.url) {
        covers[lid] = p.url as string;
      }
    }
  }

  // 5) формируем ответ
  const rows = chats.map((c) => {
    const lid = c.listing_id as string | null;
    const listing = lid && listingMap[lid] ? listingMap[lid] : null;
    return {
      id: c.id,
      listing_id: lid,
      owner_id: c.owner_id,
      participant_id: c.participant_id,
      last_message_at: c.last_message_at || c.created_at,
      last_message_preview: c.last_message_preview ?? null,
      listing,                           // { id, title, city } | null
      cover_url: lid && covers[lid] ? covers[lid] : null,
    };
  });

  return NextResponse.json({ rows });
}
