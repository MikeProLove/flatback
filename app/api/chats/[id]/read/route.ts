// app/api/chats/[id]/read/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // доступ только участникам бронирования
    const { data: br } = await sb
      .from('booking_requests')
      .select('id, owner_id, tenant_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!br || (br.owner_id !== userId && br.tenant_id !== userId)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { error } = await sb
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', params.id)
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[read] POST', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
