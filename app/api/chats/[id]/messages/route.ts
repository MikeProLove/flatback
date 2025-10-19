// app/api/chats/[id]/messages/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function bad(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return bad(401, 'unauthorized');

  const sb = getSupabaseAdmin();

  // проверка членства
  const { data: chat } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!chat) return bad(404, 'not_found');

  const member = [chat.owner_id, chat.participant_id].includes(userId);
  if (!member) return bad(403, 'forbidden');

  const { data: messages, error } = await sb
    .from('chat_messages')
    .select('id, created_at, sender_id, body')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return bad(500, 'db_error');

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return bad(401, 'unauthorized');

  const sb = getSupabaseAdmin();

  const { data: chat } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!chat) return bad(404, 'not_found');

  const member = [chat.owner_id, chat.participant_id].includes(userId);
  if (!member) return bad(403, 'forbidden');

  const bodyJson = await req.json().catch(() => ({}));
  const body = String(bodyJson?.body ?? '').trim();
  if (!body) return bad(400, 'empty');

  const ins = await sb
    .from('chat_messages')
    .insert({
      chat_id: params.id,
      sender_id: userId,
      body,
    })
    .select('id')
    .single();

  if (ins.error) return bad(500, 'db_error');

  return NextResponse.json({ ok: true, id: ins.data.id });
}
