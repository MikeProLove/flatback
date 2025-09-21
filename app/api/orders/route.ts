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
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const items = (body?.items ?? []) as Line[];
    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse('No items', { status: 400 });
    }

    // Валидация
    for (const l of items) {
      if (!l || !l.kind || !l.id || !l.name || !Number.isFinite(l.price) || !Number.isFinite(l.qty)) {
        return new NextResponse('Invalid payload', { status: 400 });
      }
    }

    const total = items.reduce((sum, l) => sum + l.price * l.qty, 0);

    const supabase = getSupabaseServer();

    // создаём заказ
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total,
        currency: 'RUB',
        status: 'pending',
      })
      .select('id')
      .limit(1);

    if (orderErr || !orderRows || orderRows.length === 0) {
      console.error('[orders] insert error', orderErr);
      return new NextResponse('Failed to create order', { status: 500 });
    }

    const orderId = orderRows[0].id;

    // добавляем позиции
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

    return NextResponse.json({ orderId });
  } catch (e: any) {
    console.error('[orders] route error', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
