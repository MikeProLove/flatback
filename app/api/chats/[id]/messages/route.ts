// app/api/chats/[id]/messages/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // проверим участие в чате
  const { data: c } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (c.owner_id !== userId && c.participant_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: msgs } = await sb
    .from('chat_messages')
    .select('id, created_at, sender_id, body')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    chat: { id: params.id, owner_id: c.owner_id, participant_id: c.participant_id },
    messages: msgs ?? [],
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { body } = await req.json().catch(() => ({}));
  const text = (body || '').trim();
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const sb = getSupabaseAdmin();

  // право на чат
  const { data: c } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (c.owner_id !== userId && c.participant_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const ins = await sb
    .from('chat_messages')
    .insert({ chat_id: params.id, sender_id: userId, body: text })
    .select('id')
    .single();

  if (ins.error) {
    return NextResponse.json({ error: 'db_error', message: ins.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: ins.data.id });
}
