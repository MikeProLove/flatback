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

function statusLabel(s: string) {
  switch (s) {
    case 'pending': return 'ожидает';
    case 'paid': return 'оплачен';
    case 'assigned': return 'передан';
    case 'in_progress': return 'в работе';
    case 'completed': return 'выполнен';
    case 'cancelled': return 'отменён';
    default: return s;
  }
}

async function getOrders(userId: string, status?: string, paid?: string): Promise<OrderRow[]> {
  const supabase = getSupabaseServer();
  let q = supabase
    .from('orders')
    .select('id, created_at, amount, is_paid, paid_at, status, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all' && status !== 'active') {
    q = q.eq('status', status);
  }
  if (status === 'active') {
    q = q.in('status', ['pending','paid','assigned','in_progress']);
  }
  if (paid === 'true') q = q.eq('is_paid', true);
  if (paid === 'false') q = q.eq('is_paid', false);

  const { data, error } = await q;
  if (error) {
    console.error('[orders:list] ', error.message);
    return [];
  }
  return (data as unknown as OrderRow[]) ?? [];
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { [k: string]: string | string[] | undefined };
}) {
  const { userId } = auth();
  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Заказы</h1>
        <AuthRequired redirectTo="/orders" />
      </div>
    );
  }

  const status = typeof searchParams?.status === 'string' ? searchParams!.status : 'all';
  const paid = typeof searchParams?.paid === 'string' ? searchParams!.paid : undefined;

  const orders = await getOrders(userId, status, paid);

  const link = (s: string, p?: string) => {
    const sp = new URLSearchParams();
    if (s) sp.set('status', s);
    if (p !== undefined) sp.set('paid', p);
    const qs = sp.toString();
    return qs ? `/orders?${qs}` : '/orders';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Заказы</h1>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2">
        <a href={link('all')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='all'?'bg-muted/40':''}`}>Все</a>
        <a href={link('active')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='active'?'bg-muted/40':''}`}>Активные</a>
        <a href={link('pending')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='pending'?'bg-muted/40':''}`}>Ожидают</a>
        <a href={link('paid')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='paid'?'bg-muted/40':''}`}>Оплачены</a>
        <a href={link('assigned')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='assigned'?'bg-muted/40':''}`}>Переданы</a>
        <a href={link('in_progress')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='in_progress'?'bg-muted/40':''}`}>В работе</a>
        <a href={link('completed')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='completed'?'bg-muted/40':''}`}>Выполнены</a>
        <a href={link('cancelled')} className={`px-3 py-1.5 rounded-md border text-sm ${status==='cancelled'?'bg-muted/40':''}`}>Отменены</a>

        <span className="mx-2 text-muted-foreground">|</span>
        <a href={link(status, 'true')} className={`px-3 py-1.5 rounded-md border text-sm ${paid==='true'?'bg-muted/40':''}`}>Только оплаченные</a>
        <a href={link(status, 'false')} className={`px-3 py-1.5 rounded-md border text-sm ${paid==='false'?'bg-muted/40':''}`}>Только не оплаченные</a>
        <a href={link(status)} className={`px-3 py-1.5 rounded-md border text-sm ${paid===undefined?'bg-muted/40':''}`}>Все по оплате</a>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Ничего не найдено.
        </div>
      ) : (
        <div className="rounded-2xl border divide-y">
          {orders.map((o) => (
            <a
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition"
            >
              <div className="w-44 text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleString('ru-RU')}
              </div>
              <div className="flex-1 font-medium">{statusLabel(o.status)}</div>
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
