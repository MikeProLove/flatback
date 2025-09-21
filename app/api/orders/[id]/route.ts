import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';

const ALLOWED: Record<string, string[]> = {
  pending:     ['paid','cancelled'],
  paid:        ['assigned','cancelled'],
  assigned:    ['in_progress','cancelled'],
  in_progress: ['completed','cancelled'],
  completed:   [],
  cancelled:   [],
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const action = body?.action as 'pay' | 'unpay' | 'status' | undefined;
    const newStatus = body?.status as string | undefined;
    if (!action) return new NextResponse('Bad request', { status: 400 });

    const supabase = getSupabaseServer();

    // читаем заказ и проверяем владельца
    const { data: rows, error: readErr } = await supabase
      .from('orders')
      .select('id, user_id, is_paid, status')
      .eq('id', params.id)
      .limit(1);

    if (readErr || !rows || !rows[0]) return new NextResponse('Not found', { status: 404 });
    const order = rows[0] as { id: string; user_id: string | null; is_paid: boolean; status: string };
    if (order.user_id !== userId) return new NextResponse('Forbidden', { status: 403 });

    if (action === 'pay') {
      // помечаем оплаченным; если был pending — переводим в paid
      const patch: any = { is_paid: true, paid_at: new Date().toISOString() };
      if (order.status === 'pending') patch.status = 'paid';
      const { error } = await supabase.from('orders').update(patch).eq('id', params.id);
      if (error) return new NextResponse('Failed to update', { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'unpay') {
      // снимаем оплату; если статус был 'paid' — вернём в 'pending'
      const patch: any = { is_paid: false, paid_at: null };
      if (order.status === 'paid') patch.status = 'pending';
      const { error } = await supabase.from('orders').update(patch).eq('id', params.id);
      if (error) return new NextResponse('Failed to update', { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'status') {
      if (!newStatus) return new NextResponse('Bad request', { status: 400 });
      const allowed = ALLOWED[order.status] || [];
      if (!allowed.includes(newStatus)) {
        return new NextResponse('Transition not allowed', { status: 400 });
      }
      // статус 'paid' возможен только если реально оплачено
      if (newStatus === 'paid' && !order.is_paid) {
        return new NextResponse('Mark as paid first', { status: 400 });
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', params.id);

      if (error) return new NextResponse('Failed to update', { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return new NextResponse('Bad request', { status: 400 });
  } catch (e) {
    console.error('[orders:PATCH] ', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    const supabase = getSupabaseServer();

    const { data: rows, error: readErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', params.id)
      .limit(1);

    if (readErr || !rows || !rows[0]) return new NextResponse('Not found', { status: 404 });
    if (rows[0].user_id !== userId) return new NextResponse('Forbidden', { status: 403 });

    const { error: delErr } = await supabase.from('orders').delete().eq('id', params.id);
    if (delErr) return new NextResponse('Failed to delete', { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[orders:DELETE] ', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
