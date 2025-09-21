// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';

type Line = {
  kind: 'product' | 'service';
  id: string;
  name: string;
  price: number;
  qty: number;
};

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await request.json();
    const items = (body?.items ?? []) as Line[];
    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse('No items', { status: 400 });
    }
    for (const l of items) {
      if (!l || !l.kind || !l.id || !l.name || !Number.isFinite(l.price) || !Number.isFinite(l.qty)) {
        return new NextResponse('Invalid payload', { status: 400 });
      }
    }

    const amount = items.reduce((sum, l) => sum + l.price * l.qty, 0);

    const supabase = getSupabaseServer();

    // создаём заказ под твою схему
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .insert({
        amount,
        is_paid: false,
        status: 'pending', // enum: pending
        user_id: userId,
        tenant_id: null,
        owner_id: null,
        paid_at: null,
      })
      .select('id')
      .limit(1);

    if (orderErr || !orderRows?.[0]) {
      console.error('[orders] insert error', orderErr);
      return new NextResponse('Failed to create order', { status: 500 });
    }
    const orderId = orderRows[0].id;

    // позиции
    const rows = items.map((l) => ({
      order_id: orderId,
      kind: l.kind,
      item_id: l.id,
      name: l.name,
      price: l.price,
      qty: l.qty,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(rows);
    if (itemsErr) {
      console.error('[order_items] insert error', itemsErr);
      return new NextResponse('Failed to add items', { status: 500 });
    }

    // лог события
    await supabase.from('order_events').insert({
      order_id: orderId,
      kind: 'created',
      payload: { amount, items_count: items.length },
    });

    return NextResponse.json({ orderId });
  } catch (e) {
    console.error('[orders] route error', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
