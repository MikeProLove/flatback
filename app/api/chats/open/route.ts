// app/api/chats/open/route.ts
export const runtime = 'nodejs';// app/api/chats/open/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { listingId, ownerId } = await req.json();

    if (!listingId || !ownerId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    if (ownerId === userId) {
      return NextResponse.json({ error: 'self_chat_forbidden' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // ВАЖНО: .upsert c onConflict по трём колонкам опирается на UNIQUE(chats_unique_pair)
    const { data, error } = await sb
      .from('chats')
      .upsert(
        { listing_id: listingId, owner_id: ownerId, participant_id: userId },
        { onConflict: 'listing_id,owner_id,participant_id' }
      )
      .select('id')
      .single();

    if (error || !data) {
      // Если вдруг конфликт обработать не удалось — пробуем найти вручную
      const { data: existed } = await sb
        .from('chats')
        .select('id')
        .eq('listing_id', listingId)
        .eq('owner_id', ownerId)
        .eq('participant_id', userId)
        .maybeSingle();

      if (!existed) {
        return NextResponse.json({ error: 'db_error', message: error?.message }, { status: 500 });
      }
      return NextResponse.json({ id: existed.id });
    }

    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'internal', message: e?.message }, { status: 500 });
  }
}
