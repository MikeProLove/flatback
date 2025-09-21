import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { money } from '@/lib/format';
import AuthRequired from '@/components/AuthRequired';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  created_at: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  status: string;
  user_id: string | null;
};

async function getOrders(userId: string): Promise<OrderRow[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, amount, is_paid, paid_at, status, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[orders:list] ', error.message);
    return [];
  }
  return (data as unknown as OrderRow[]) ?? [];
}

export default async function OrdersPage() {
  const { userId } = auth();
  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Заказы</h1>
        <AuthRequired redirectTo="/orders" />
      </div>
    );
  }

  const orders = await getOrders(userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Заказы</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Заказов пока нет.
        </div>
      ) : (
        <div className="rounded-2xl border divide-y">
          {orders.map((o) => (
            <a
              key={o.id}
              href={`/orders/${o.id}`}                // ⬅️ каждая строка кликабельна
              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition"
            >
              <div className="w-40 text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString('ru-RU')}
              </div>
              <div className="flex-1 font-medium">{o.status}</div>
              <div className="w-28 text-right">{money(Number(o.amount) || 0)}</div>
              <div className="w-28 text-right">
                {o.is_paid ? (
                  <span className="text-green-600">оплачен</span>
                ) : (
                  <span className="text-amber-600">ожидает</span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
