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
      if (
        !l ||
        (l.kind !== 'product' && l.kind !== 'service') ||
        !l.id ||
        !l.name ||
        !Number.isFinite(l.price) ||
        !Number.isFinite(l.qty)
      ) {
        return new NextResponse('Invalid payload', { status: 400 });
      }
    }

    const amount = items.reduce((sum, l) => sum + l.price * l.qty, 0);

    const supabase = getSupabaseServer();

    // ⚠️ Под твою схему: amount + is_paid + status + user_id
    // status: даём 'pending' и рассчитываем, что он есть в enum или стоит дефолт
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .insert({
        amount,           // numeric NOT NULL
        is_paid: false,   // boolean NOT NULL
        status: 'pending',// USER-DEFINED NOT NULL (должно существовать значение или быть DEFAULT)
        user_id: userId,  // text (nullable в твоей схеме)
        tenant_id: null,  // опционально
        owner_id: null,   // опционально
        paid_at: null     // опционально
      })
      .select('id')
      .limit(1);

    if (orderErr || !orderRows || orderRows.length === 0) {
      console.error('[orders] insert error', orderErr);
      return new NextResponse('Failed to create order', { status: 500 });
    }

    const orderId = orderRows[0].id;

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
