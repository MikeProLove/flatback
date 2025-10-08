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
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { ownerId, listingId } = await req.json();
    if (!ownerId || !listingId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    if (ownerId === userId) {
      return NextResponse.json({ error: 'self_chat_forbidden' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // ищем существующий чат между этими двумя участниками для этого объявления
    const { data: found } = await sb
      .rpc('find_chat_between', {
        p_listing_id: listingId,
        p_user_a: userId,
        p_user_b: ownerId,
      }); // функцию создадим ниже SQL-скриптом (см. комментарий)

    let chatId: string | null = (found && found[0]?.id) || null;

    if (!chatId) {
      // 1) создаём чат
      const { data: created, error: cErr } = await sb
        .from('chats')
        .insert({ listing_id: listingId, created_by: userId })
        .select('id')
        .limit(1)
        .maybeSingle();
      if (cErr || !created) {
        console.error('[chat] create', cErr);
        return NextResponse.json({ error: 'create_failed' }, { status: 500 });
      }
      chatId = created.id;

      // 2) добавляем обоих участников
      const { error: mErr } = await sb.from('chat_members').insert([
        { chat_id: chatId, user_id: userId },
        { chat_id: chatId, user_id: ownerId },
      ]);
      if (mErr) {
        console.error('[chat_members] insert', mErr);
        return NextResponse.json({ error: 'members_failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ id: chatId });
  } catch (e) {
    console.error('[chats/open] error', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
