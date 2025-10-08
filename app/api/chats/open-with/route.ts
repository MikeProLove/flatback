// app/api/chats/open-with/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { listingId, otherUserId } = await req.json().catch(() => ({}));
  if (!listingId || !otherUserId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // проверим, что я — владелец listingId
  const L = await sb
    .from('listings')
    .select('id, owner_id, user_id')
    .eq('id', listingId)
    .maybeSingle();
  if (L.error || !L.data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const owner = L.data.owner_id || L.data.user_id;
  if (owner !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // ищем существующий чат
  const C = await sb
    .from('chats')
    .select('id')
    .eq('listing_id', listingId)
    .eq('owner_id', userId)
    .eq('participant_id', otherUserId)
    .maybeSingle();

  if (!C.error && C.data) return NextResponse.json({ id: C.data.id });

  // создаём
  const Ins = await sb
    .from('chats')
    .insert({
      listing_id: listingId,
      owner_id: userId,
      participant_id: otherUserId,
    })
    .select('id')
    .maybeSingle();

  if (Ins.error || !Ins.data) {
    return NextResponse.json({ error: 'db_error', message: Ins.error?.message || '' }, { status: 500 });
  }
  return NextResponse.json({ id: Ins.data.id });
}
