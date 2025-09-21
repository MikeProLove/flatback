// app/orders/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { money } from '@/lib/format';
import AuthRequired from '@/components/AuthRequired';
import OrderActions from './ui/OrderActions';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  created_at: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  status: string; // enum
  user_id: string | null;
};

type ItemRow = {
  id: string;
  kind: 'product' | 'service';
  item_id: string;
  name: string;
  price: number;
  qty: number;
  created_at: string;
};

async function getOrder(
  userId: string,
  id: string
): Promise<{ order: OrderRow | null; items: ItemRow[] }> {
  const supabase = getSupabaseServer();

  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .select('id, created_at, amount, is_paid, paid_at, status, user_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (orderErr) {
    console.error('[orders:detail] ', orderErr.message);
    return { order: null, items: [] };
  }

  const order = (orderData as OrderRow | null) ?? null;

  let items: ItemRow[] = [];
  if (order) {
    const { data: itemData, error: itemsErr } = await supabase
      .from('order_items')
      .select('id, kind, item_id, name, price, qty, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    if (itemsErr) {
      console.error('[order_items:list] ', itemsErr.message);
    } else {
      items = (itemData as unknown as ItemRow[]) ?? [];
    }
  }

  return { order, items };
}

function statusLabel(s: string) {
  switch (s) {
    case 'pending':
      return 'Ожидает';
    case 'paid':
      return 'Оплачен';
    case 'assigned':
      return 'Передан исполнителю';
    case 'in_progress':
      return 'В работе';
    case 'completed':
      return 'Выполнен';
    case 'cancelled':
      return 'Отменён';
    default:
      return s;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Заказ</h1>
        <AuthRequired redirectTo={`/orders/${params.id}`} />
      </div>
    );
  }

  const { order, items } = await getOrder(userId, params.id);
  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Заказ #{order!.id.slice(0, 8)}
          </h1>
          <div className="text-sm text-muted-foreground">
            от {new Date(order!.created_at).toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground">Итого</div>
          <div className="text-2xl font-semibold">
            {money(Number(order!.amount) || 0)}
          </div>
          <div className="text-sm mt-1">
            Статус:{' '}
            <span className="font-medium">{statusLabel(order!.status)}</span>
            {' · '}
            {order!.is_paid ? (
              <span className="text-green-600">оплачен</span>
            ) : (
              <span className="text-amber-600">не оплачен</span>
            )}
          </div>

          {/* Кнопка "Изменить состав" — доступна только для pending и не оплачен */}
          {!order!.is_paid && order!.status === 'pending' ? (
            <div className="mt-2">
              <a
                href={`/orders/${order!.id}/edit`}
                className="px-3 py-2 rounded-md border text-sm inline-block"
              >
                Изменить состав
              </a>
            </div>
          ) : null}

          <OrderActions
            orderId={order!.id}
            isPaid={order!.is_paid}
            status={order!.status as any}
          />
        </div>
      </div>

      <div className="rounded-2xl border divide-y">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            Позиции не найдены.
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="p-4 flex items-center gap-4">
              <div className="min-w-24 text-xs uppercase text-muted-foreground">
                {it.kind === 'product' ? 'Товар' : 'Услуга'}
              </div>
              <div className="flex-1 font-medium">{it.name}</div>
              <div className="w-28 text-right">
                {money(Number(it.price) || 0)}
              </div>
              <div className="w-24 text-right">× {it.qty}</div>
              <div className="w-28 text-right font-semibold">
                {money((Number(it.price) || 0) * it.qty)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
