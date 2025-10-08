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

  // 1) сами чаты + заголовок объявления
  const { data: chats, error } = await sb
    .from('chats')
    .select(`
      id,
      created_at,
      listing_id,
      owner_id,
      participant_id,
      last_message_at,
      last_message_preview,
      listing:listings(id,title,city)
    `)
    .or(`owner_id.eq.${userId},participant_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });

  // 2) подтянем обложки для объявлений, чтобы было красиво
  const listingIds = [...new Set((chats ?? []).map(c => c.listing_id).filter(Boolean))] as string[];
  let covers = new Map<string, string>();
  if (listingIds.length) {
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });
    for (const p of photos ?? []) {
      if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url as string);
    }
  }

  const rows = (chats ?? []).map(c => ({
    id: c.id,
    listing_id: c.listing_id,
    owner_id: c.owner_id,
    participant_id: c.participant_id,
    last_message_at: c.last_message_at ?? c.created_at,
    last_message_preview: c.last_message_preview ?? null,
    listing: c.listing ?? null,
    cover_url: c.listing_id ? covers.get(c.listing_id) ?? null : null,
  }));

  return NextResponse.json({ rows });
}
