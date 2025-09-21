// app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const action = body?.action as 'pay' | 'unpay' | undefined;
    if (!action) return new NextResponse('Bad request', { status: 400 });

    const supabase = getSupabaseServer();

    // Проверим, что заказ принадлежит пользователю
    const { data: rows, error: readErr } = await supabase
      .from('orders')
      .select('id, user_id, is_paid')
      .eq('id', params.id)
      .limit(1);

    if (readErr || !rows || !rows[0]) {
      return new NextResponse('Not found', { status: 404 });
    }
    if (rows[0].user_id !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const patch =
      action === 'pay'
        ? { is_paid: true, paid_at: new Date().toISOString() }
        : { is_paid: false, paid_at: null };

    const { error: updErr } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', params.id);

    if (updErr) {
      console.error('[orders:update] ', updErr);
      return new NextResponse('Failed to update', { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[orders:PATCH] ', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const supabase = getSupabaseServer();

    // Проверка владельца
    const { data: rows, error: readErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', params.id)
      .limit(1);

    if (readErr || !rows || !rows[0]) {
      return new NextResponse('Not found', { status: 404 });
    }
    if (rows[0].user_id !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Удаляем (каскад должен удалить order_items, если задан foreign key ON DELETE CASCADE)
    const { error: delErr } = await supabase.from('orders').delete().eq('id', params.id);
    if (delErr) {
      console.error('[orders:delete] ', delErr);
      return new NextResponse('Failed to delete', { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[orders:DELETE] ', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
