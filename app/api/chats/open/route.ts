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
    const listingId: string | undefined = body?.listingId || undefined;
    const otherIdRaw: string | null | undefined = body?.otherId;

    if (!listingId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId обязателен' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Владелец объявления
    const { data: L, error: eL } = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .eq('id', listingId)
      .maybeSingle();

    if (eL || !L) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const listingOwner: string | null = (L.owner_id as string | null) ?? (L.user_id as string | null);

    if (!listingOwner) {
      return NextResponse.json({ error: 'no_owner', message: 'У объявления не найден владелец' }, { status: 400 });
    }

    // Определяем участника:
    // 1) если otherId передали — используем его
    // 2) если не передали (кнопка со страницы объявления) — участник это ТЕКУЩИЙ пользователь,
    //    а owner всегда владелец объявления
    const participant = (otherIdRaw || undefined) ?? userId;

    // Проверка на self
    if (participant === listingOwner) {
      return NextResponse.json(
        { error: 'chats_no_self', message: 'Нельзя открыть чат с самим собой' },
        { status: 400 }
      );
    }

    // Ищем существующий чат (owner — всегда владелец объявления)
    const existing = await sb
      .from('chats')
      .select('id')
      .eq('listing_id', listingId)
      .eq('owner_id', listingOwner)
      .eq('participant_id', participant)
      .maybeSingle();

    if (existing.data?.id) {
      return NextResponse.json({ id: existing.data.id });
    }

    // Создаём
    const ins = await sb
      .from('chats')
      .insert({
        listing_id: listingId,
        owner_id: listingOwner,
        participant_id: participant,
      })
      .select('id')
      .single();

    if (ins.error || !ins.data) {
      return NextResponse.json(
        { error: 'db_error', message: ins.error?.message || 'insert_failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: ins.data.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
