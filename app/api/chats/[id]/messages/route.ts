// app/api/chats/[id]/messages/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function assertMember(sb: ReturnType<typeof getSupabaseAdmin>, chatId: string, userId: string) {
  const { data, error } = await sb
    .from('chats')
    .select('id, owner_id, participant_id')
    .eq('id', chatId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, reason: 'db_error' as const };
  if (!data) return { ok: false as const, status: 404, reason: 'not_found' as const };
  if (data.owner_id !== userId && data.participant_id !== userId) {
    return { ok: false as const, status: 403, reason: 'forbidden' as const };
  }
  return { ok: true as const };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const check = await assertMember(sb, params.id, userId);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: check.status });

  const { data, error } = await sb
    .from('chat_messages')
    .select('id, created_at, sender_id, body')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const check = await assertMember(sb, params.id, userId);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: check.status });

  const { body } = await req.json().catch(() => ({}));
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return NextResponse.json({ error: 'bad_request', message: 'empty' }, { status: 400 });

  const ins = await sb
    .from('chat_messages')
    .insert({ chat_id: params.id, sender_id: userId, body: text })
    .select('id, created_at, sender_id, body')
    .single();

  if (ins.error || !ins.data) {
    return NextResponse.json({ error: 'db_error', message: ins.error?.message }, { status: 500 });
  }
  return NextResponse.json({ message: ins.data });
}
