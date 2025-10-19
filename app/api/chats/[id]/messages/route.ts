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

  // проверим, что пользователь — участник
  const { data: c } = await sb
    .from('chats')
    .select('id')
    .eq('id', params.id)
    .or(`owner_id.eq.${userId},participant_id.eq.${userId}`)
    .maybeSingle();
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: msgs, error } = await sb
    .from('chat_messages')
    .select('id, created_at, sender_id, body')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ messages: msgs ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { body } = await req.json().catch(() => ({}));
  const text = String(body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const sb = getSupabaseAdmin();

  // вставим
  const { error } = await sb.from('chat_messages').insert({
    chat_id: params.id,
    sender_id: userId,
    body: text,
  });

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
