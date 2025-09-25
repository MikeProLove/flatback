// app/api/requests/owner/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Body = { id: string; action: 'approve' | 'decline' | 'mark_paid' | 'refund' };

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = (await req.json()) as Body;
    if (!body?.id || !body?.action) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Проверяем, что это заявка на моё объявление
    const { data: rows, error: selErr } = await sb
      .from('booking_requests')
      .select('id,owner_id,status,payment_status')
      .eq('id', body.id)
      .limit(1);

    if (selErr) return NextResponse.json({ error: 'db', message: selErr.message }, { status: 500 });
    const found = rows?.[0];
    if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (found.owner_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let patch: Record<string, any> = {};
    switch (body.action) {
      case 'approve':
        patch.status = 'approved';
        break;
      case 'decline':
        patch.status = 'declined';
        break;
      case 'mark_paid':
        patch.payment_status = 'paid';
        break;
      case 'refund':
        patch.payment_status = 'refunded';
        break;
      default:
        return NextResponse.json({ error: 'bad_action' }, { status: 400 });
    }

    const { error: upErr } = await sb
      .from('booking_requests')
      .update(patch)
      .eq('id', body.id);

    if (upErr) return NextResponse.json({ error: 'db', message: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[requests/owner] PATCH', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
