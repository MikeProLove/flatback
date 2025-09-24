// app/api/chats/[id]/read/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const isUuid = (v: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!isUuid(params.id)) {
      return NextResponse.json({ error: 'invalid_booking_id' }, { status: 400 });
    }

    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();

    // доступ только участникам заявки
    const { data: br, error: be } = await sb
      .from('booking_requests')
      .select('id, owner_id, tenant_id')
      .eq('id', params.id)
      .maybeSingle();

    if (be) return NextResponse.json({ error: 'db', message: be.message }, { status: 500 });
    if (!br || (br.owner_id !== userId && br.tenant_id !== userId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { error } = await sb
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', params.id)
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[read] POST', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
