// app/api/chats/[id]/messages/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function canAccess(sb: ReturnType<typeof getSupabaseAdmin>, bookingId: string, userId: string) {
  const { data, error } = await sb
    .from('booking_requests')
    .select('id, owner_id, tenant_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !data) return null;
  const isOwner = data.owner_id === userId;
  const isTenant = data.tenant_id === userId;
  if (!isOwner && !isTenant) return null;
  return { owner_id: data.owner_id as string, tenant_id: data.tenant_id as string };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const acc = await canAccess(sb, params.id, userId);
    if (!acc) return new NextResponse('Forbidden', { status: 403 });

    const { data, error } = await sb
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .eq('booking_id', params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { messages: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[chat GET]', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const acc = await canAccess(sb, params.id, userId);
    if (!acc) return new NextResponse('Forbidden', { status: 403 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

    const recipient =
      userId === acc.owner_id ? acc.tenant_id :
      userId === acc.tenant_id ? acc.owner_id : null;
    if (!recipient) return new NextResponse('Forbidden', { status: 403 });

    const { error } = await sb.from('messages').insert({
      booking_id: params.id,
      sender_id: userId,
      recipient_id: recipient,
      body: text,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[chat POST]', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
