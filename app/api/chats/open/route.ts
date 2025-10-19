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

    const body = await req.json().catch(() => ({}));
    const listingId: string | undefined = body?.listingId;
    let otherId: string | undefined = body?.otherId || body?.otherUserId || body?.participantId;

    if (!listingId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId обязателен' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Узнаём владельца объявления (в БД owner_id TEXT, user_id TEXT – берём любой из них)
    const { data: L, error: le } = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .eq('id', listingId)
      .maybeSingle();

    if (le || !L) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const listingOwner = (L.owner_id || L.user_id) as string | null;

    // Если otherId не передали (например, из "Мои заявки"), определяем автоматически
    if (!otherId) {
      // если я владелец объявления, мой собеседник — заявитель (рента)
      // этот кейс отработает в "Заявки на мои" (ниже мы передаём renterId прямо из API),
      // а здесь fallback — запретить чат с самим собой
      otherId = listingOwner === userId ? undefined : listingOwner || undefined;
    }

    if (!otherId) {
      return NextResponse.json({ error: 'bad_request', message: 'Не удалось определить собеседника (otherId)' }, { status: 400 });
    }

    // Нельзя открывать чат с самим собой
    if (otherId === userId) {
      return NextResponse.json({ error: 'self_forbidden', message: 'Нельзя открыть чат с самим собой' }, { status: 400 });
    }

    // Владелец чата — именно владелец объявления
    const chatOwner = listingOwner || otherId;

    // Ищем уже существующий чат
    const ex = await sb
      .from('chats')
      .select('id')
      .eq('listing_id', listingId)
      .eq('owner_id', chatOwner)
      .eq('participant_id', chatOwner === userId ? otherId : userId) // на случай если earlier data были кривыми
      .maybeSingle();

    if (ex.data) return NextResponse.json({ id: ex.data.id });

    // Если не нашли — создаём
    const ins = await sb
      .from('chats')
      .insert({
        listing_id: listingId,
        owner_id: chatOwner,
        participant_id: userId === chatOwner ? otherId : userId, // участник — не владелец
      })
      .select('id')
      .single();

    if (ins.error) {
      // отлавливаем check constraint chats_no_self
      if (ins.error.message?.includes('chats_no_self')) {
        return NextResponse.json({ error: 'self_forbidden', message: 'Нельзя открыть чат с самим собой' }, { status: 400 });
      }
      return NextResponse.json({ error: 'db_error', message: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ id: ins.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
