// app/api/bookings/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type BR = {
  id: string;
  owner_id: string;
  tenant_id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const { data: row } = await sb.from('booking_requests').select('id, owner_id, tenant_id, status').eq('id', params.id).maybeSingle();
    if (!row) return new NextResponse('Not found', { status: 404 });
    const br = row as BR;

    const body = await req.json().catch(() => ({} as any));
    const action = String(body.action || '').toLowerCase(); // 'approve' | 'decline' | 'cancel'

    // Владелец может approve/decline pending
    if ((action === 'approve' || action === 'decline') && userId === br.owner_id) {
      if (br.status !== 'pending') return new NextResponse('Invalid state', { status: 409 });

      const next = action === 'approve' ? 'approved' : 'declined';
      const { error } = await sb
        .from('booking_requests')
        .update({ status: next, decided_at: new Date().toISOString() })
        .eq('id', br.id);

      if (error) {
        console.error('[bookings] owner update', error);
        return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Арендатор может cancel, если не approved
    if (action === 'cancel' && userId === br.tenant_id) {
      if (br.status === 'approved') return new NextResponse('Already approved', { status: 409 });

      const { error } = await sb
        .from('booking_requests')
        .update({ status: 'cancelled', decided_at: new Date().toISOString() })
        .eq('id', br.id);

      if (error) {
        console.error('[bookings] cancel', error);
        return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return new NextResponse('Forbidden', { status: 403 });
  } catch (e: any) {
    console.error('[bookings] PATCH error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
