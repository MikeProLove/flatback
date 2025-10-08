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
    // допускаем разные имена поля для контрагента
    const otherId: string | undefined =
      body?.otherId || body?.participantId || body?.renterId;

    if (!listingId || !otherId) {
      return NextResponse.json(
        { error: 'bad_request', message: 'listingId и otherId обязательны' },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    // определяем владельца объявления (owner чата)
    const { data: L } = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .eq('id', listingId)
      .maybeSingle();

    if (!L) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const listingOwner = L.owner_id || L.user_id;
    const chatOwner = listingOwner || userId; // владелец чата — владелец объявления (или текущий юзер, как fallback)
    const participant = otherId;

    // есть ли уже чат?
    const existing = await sb
      .from('chats')
      .select('id')
      .eq('listing_id', listingId)
      .eq('owner_id', chatOwner)
      .eq('participant_id', participant)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ id: existing.data.id });
    }

    // создаём новый
    const ins = await sb
      .from('chats')
      .insert({
        listing_id: listingId,
        owner_id: chatOwner,
        participant_id: participant,
      })
      .select('id')
      .single();

    if (ins.error) {
      return NextResponse.json(
        { error: 'db_error', message: ins.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: ins.data.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
