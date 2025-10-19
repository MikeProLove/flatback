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
    // second party is optional — we'll resolve to listing owner if missing
    let otherId: string | undefined = body?.otherId;

    if (!listingId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId обязателен' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // 1) узнаём владельца объявления (owner чата)
    const { data: L, error: le } = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .eq('id', listingId)
      .maybeSingle();

    if (le || !L) {
      return NextResponse.json({ error: 'not_found', message: 'Объявление не найдено' }, { status: 404 });
    }

    const listingOwner: string | null = L.owner_id || L.user_id || null;

    // если otherId не передали — чатом становитесь вы (покупатель) и владелец объявления
    if (!otherId) {
      if (!listingOwner) {
        return NextResponse.json({ error: 'db_error', message: 'У объявления нет владельца' }, { status: 500 });
      }
      // если текущий пользователь и есть владелец — открывать чат нельзя
      otherId = listingOwner;
    }

    // 2) запрет "сам с собой"
    if (otherId === userId) {
      return NextResponse.json(
        { error: 'chats_no_self', message: 'Нельзя открыть чат с самим собой' },
        { status: 400 }
      );
    }

    // 3) владелец чата — именно владелец объявления; второй участник — текущий пользователь, если он не владелец
    const ownerId = listingOwner === userId ? userId : listingOwner;
    const participantId = listingOwner === userId ? otherId : userId;

    if (!ownerId || !participantId) {
      return NextResponse.json({ error: 'bad_request', message: 'Не определены участники' }, { status: 400 });
    }

    // 4) ищем уже существующий чат
    const existing = await sb
      .from('chats')
      .select('id')
      .eq('listing_id', listingId)
      .eq('owner_id', ownerId)
      .eq('participant_id', participantId)
      .maybeSingle();

    if (existing.data?.id) {
      return NextResponse.json({ id: existing.data.id });
    }

    // 5) создаём
    const ins = await sb
      .from('chats')
      .insert({
        listing_id: listingId,
        owner_id: ownerId,
        participant_id: participantId,
      })
      .select('id')
      .single();

    if (ins.error) {
      return NextResponse.json({ error: 'db_error', message: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ id: ins.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
