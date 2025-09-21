// app/orders/[id]/ui/OrderActions.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderActions({
  orderId,
  isPaid,
}: {
  orderId: string;
  isPaid: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function run(action: 'pay' | 'unpay') {
    setErr(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    router.refresh();
  }

  async function remove() {
    setErr(null);
    const ok = confirm('Удалить заказ? Действие необратимо.');
    if (!ok) return;
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    router.push('/orders');
  }

  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      {err ? <div className="text-sm text-red-600 mr-auto">{err}</div> : null}
      {isPaid ? (
        <button
          type="button"
          className="px-3 py-2 rounded-md border"
          disabled={pending}
          onClick={() => start(() => run('unpay'))}
        >
          Снять оплату
        </button>
      ) : (
        <button
          type="button"
          className="px-3 py-2 rounded-md border"
          disabled={pending}
          onClick={() => start(() => run('pay'))}
        >
          Отметить оплаченным
        </button>
      )}
      <button
        type="button"
        className="px-3 py-2 rounded-md border"
        disabled={pending}
        onClick={() => start(remove)}
      >
        Удалить
      </button>
    </div>
  );
}
