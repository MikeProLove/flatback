// app/api/bookings/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type BR = {
  id: string;
  owner_id: string;
  tenant_id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'refunded';
  start_date: string;
  end_date: string;
};

async function hasConflict(
  sb: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  start: string,
  end: string,
  excludeId?: string
) {
  let q = sb
    .from('booking_requests')
    .select('id')
    .eq('listing_id', listingId)
    .eq('status', 'approved')
    .lte('start_date', end)
    .gte('end_date', start);

  if (excludeId) q = q.neq('id', excludeId);

  const { data, error } = await q.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const { data: row } = await sb
      .from('booking_requests')
      .select('id, owner_id, tenant_id, listing_id, status, payment_status, start_date, end_date')
      .eq('id', params.id)
      .maybeSingle();
    if (!row) return new NextResponse('Not found', { status: 404 });
    const br = row as BR;

    const body = await req.json().catch(() => ({} as any));
    const action = String(body.action || '').toLowerCase();
    const method = (body.method as 'card' | 'cashback' | undefined) ?? 'card';

    // Владелец: approve / decline
    if ((action === 'approve' || action === 'decline') && userId === br.owner_id) {
      if (br.status !== 'pending') return new NextResponse('Invalid state', { status: 409 });

      const next = action === 'approve' ? 'approved' : 'declined';
      const { error } = await sb
        .from('booking_requests')
        .update({ status: next, decided_at: new Date().toISOString() })
        .eq('id', br.id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

      return NextResponse.json({ ok: true });
    }

    // Арендатор: cancel (пока не approved)
    if (action === 'cancel' && userId === br.tenant_id) {
      if (br.status === 'approved') return new NextResponse('Already approved', { status: 409 });

      const { error } = await sb
        .from('booking_requests')
        .update({ status: 'cancelled', decided_at: new Date().toISOString() })
        .eq('id', br.id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

      return NextResponse.json({ ok: true });
    }

    // Арендатор: pay (проверяем пересечение прямо перед оплатой)
    if (action === 'pay' && userId === br.tenant_id) {
      if (br.status !== 'approved') return new NextResponse('Not approved', { status: 409 });
      if (br.payment_status === 'paid') return new NextResponse('Already paid', { status: 409 });

      // жёсткая проверка занятости
      if (await hasConflict(sb, br.listing_id, br.start_date, br.end_date, br.id)) {
        return NextResponse.json(
          { error: 'dates_unavailable', message: 'Даты уже заняты, оплатить нельзя' },
          { status: 409 }
        );
      }

      const { error } = await sb
        .from('booking_requests')
        .update({
          payment_status: 'paid',
          payment_method: method,
          paid_at: new Date().toISOString(),
        })
        .eq('id', br.id);

      if (error) return NextResponse.json({ error: 'payment_failed', message: error.message }, { status: 500 });

      return NextResponse.json({ ok: true });
    }

    return new NextResponse('Forbidden', { status: 403 });
  } catch (e: any) {
    console.error('[bookings] PATCH error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
