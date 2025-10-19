// app/api/chats/[id]/messages/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // Проверяем, что пользователь — участник чата
  const { data: chat } = await sb
    .from('chats')
    .select('id, listing_id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!chat) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (chat.owner_id !== userId && chat.participant_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: messages, error } = await sb
    .from('chat_messages')
    .select('id, created_at, sender_id, body')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ chat, messages: messages ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  const { data: chat } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!chat) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (chat.owner_id !== userId && chat.participant_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const bodyJson = await req.json().catch(() => ({}));
  const body = String(bodyJson?.body || '').trim();
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const ins = await sb
    .from('chat_messages')
    .insert({ chat_id: params.id, sender_id: userId, body })
    .select('id')
    .single();

  if (ins.error) {
    return NextResponse.json({ error: 'db_error', message: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
