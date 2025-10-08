export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { ownerId, listingId } = await req.json().catch(() => ({}));
  if (!ownerId || !listingId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // ищем чат по listingId, где участники = текущий и владелец
  const { data: candidates, error: selErr } = await sb
    .from('chats')
    .select('id, chat_members:user_id!inner(user_id)')
    .eq('listing_id', listingId);

  if (selErr) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  const found = (candidates ?? []).find(
    (c: any) =>
      Array.isArray(c.chat_members) &&
      c.chat_members.some((m: any) => m.user_id === ownerId) &&
      c.chat_members.some((m: any) => m.user_id === userId)
  );

  if (found?.id) {
    return NextResponse.json({ id: found.id });
  }

  // создаём чат и двух участников
  const { data: chatRows, error: insErr } = await sb
    .from('chats')
    .insert({ listing_id: listingId, owner_id: ownerId })
    .select('id')
    .limit(1);

  if (insErr || !chatRows?.[0]) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const chatId = chatRows[0].id as string;

  await sb.from('chat_members').insert([
    { chat_id: chatId, user_id: ownerId },
    { chat_id: chatId, user_id: userId },
  ]);

  return NextResponse.json({ id: chatId });
}
