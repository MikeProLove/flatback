export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function assertMember(sb: ReturnType<typeof getSupabaseAdmin>, chatId: string, userId: string) {
  const { data } = await sb
    .from('chat_members')
    .select('chat_id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();
  const isMember = await assertMember(sb, params.id, userId);
  if (!isMember) return new NextResponse('Forbidden', { status: 403 });

  const { data, error } = await sb
    .from('chat_messages')
    .select('id, user_id, body, created_at')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { body } = await req.json().catch(() => ({}));
  if (!body || typeof body !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const isMember = await assertMember(sb, params.id, userId);
  if (!isMember) return new NextResponse('Forbidden', { status: 403 });

  const { data, error } = await sb
    .from('chat_messages')
    .insert({ chat_id: params.id, user_id: userId, body })
    .select('id, user_id, body, created_at')
    .limit(1);

  if (error || !data?.[0]) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  return NextResponse.json({ message: data[0] });
}
