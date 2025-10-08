// app/api/chats/open/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { listingId, ownerId } = await req.json().catch(() => ({}));
    if (!ownerId) {
      return NextResponse.json({ error: 'bad_request', message: 'ownerId required' }, { status: 400 });
    }
    if (ownerId === userId) {
      return NextResponse.json({ error: 'bad_request', message: 'self_chat' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Ищем чат между двумя участниками по конкретному объявлению (или без него)
    const { data: existing } = await sb
      .from('chats')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('participant_id', userId)
      .eq('listing_id', listingId ?? null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ id: existing.id });
    }

    // Пробуем в обратном порядке на случай старых записей
    const { data: existing2 } = await sb
      .from('chats')
      .select('id')
      .eq('owner_id', userId)
      .eq('participant_id', ownerId)
      .eq('listing_id', listingId ?? null)
      .maybeSingle();

    if (existing2) {
      return NextResponse.json({ id: existing2.id });
    }

    const insert = await sb
      .from('chats')
      .insert({ owner_id: ownerId, participant_id: userId, listing_id: listingId ?? null })
      .select('id')
      .single();

    if (insert.error || !insert.data) {
      return NextResponse.json({ error: 'db_error', message: insert.error?.message }, { status: 500 });
    }

    return NextResponse.json({ id: insert.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'internal', message: e?.message }, { status: 500 });
  }
}
