// app/api/chats/open/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Find-or-create чат между (ownerId ↔ currentUser) по конкретному listingId.
 * Требует UNIQUE(listing_id, owner_id, participant_id) в БД.
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const listingId = payload?.listingId as string | undefined;
    const ownerId = payload?.ownerId as string | undefined;

    if (!listingId || !ownerId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId and ownerId are required' }, { status: 400 });
    }
    if (ownerId === userId) {
      return NextResponse.json({ error: 'self_chat_forbidden' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // upsert опирается на UNIQUE(listing_id, owner_id, participant_id)
    const up = await sb
      .from('chats')
      .upsert(
        { listing_id: listingId, owner_id: ownerId, participant_id: userId },
        { onConflict: 'listing_id,owner_id,participant_id' }
      )
      .select('id')
      .single();

    if (up.error && !up.data) {
      // fallback: найти вручную (на случай разных версий PostgREST)
      const existed = await sb
        .from('chats')
        .select('id')
        .eq('listing_id', listingId)
        .eq('owner_id', ownerId)
        .eq('participant_id', userId)
        .maybeSingle();

      if (existed.data?.id) return NextResponse.json({ id: existed.data.id });
      return NextResponse.json({ error: 'db_error', message: up.error.message }, { status: 500 });
    }

    return NextResponse.json({ id: up.data!.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}
