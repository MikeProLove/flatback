'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const STATUSES = ['pending','paid','assigned','in_progress','completed','cancelled'] as const;
type Status = typeof STATUSES[number];

const ALLOWED: Record<Status, Status[]> = {
  pending:     ['paid','cancelled'],
  paid:        ['assigned','cancelled'],
  assigned:    ['in_progress','cancelled'],
  in_progress: ['completed','cancelled'],
  completed:   [],
  cancelled:   [],
};

export default function OrderActions({
  orderId,
  status,
  isPaid,
}: {
  orderId: string;
  status: Status;
  isPaid: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<Status | ''>('');

  const options = useMemo(() => ALLOWED[status] || [], [status]);

  async function call(action: 'pay' | 'unpay' | 'status', payload?: any) {
    setErr(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    router.refresh();
  }

  async function remove() {
    setErr(null);
    if (!confirm('Удалить заказ? Действие необратимо.')) return;
    const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    router.push('/orders');
  }

  const disableAll = status === 'completed' || status === 'cancelled';

  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      {err ? <div className="text-sm text-red-600 mr-auto">{err}</div> : null}

      {/* Смена статуса по валидной цепочке */}
      <select
        className="border rounded-md px-2 py-2 text-sm"
        value={nextStatus}
        onChange={(e) => setNextStatus(e.target.value as Status)}
        disabled={pending || disableAll || options.length === 0}
      >
        <option value="">{options.length ? 'Выбрать статус…' : 'Статусы недоступны'}</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {label(s)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        disabled={pending || disableAll || !nextStatus}
        onClick={() => start(() => call('status', { status: nextStatus }))}
      >
        Изменить статус
      </button>

      {/* Оплата */}
      {isPaid ? (
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          disabled={pending || disableAll}
          onClick={() => start(() => call('unpay'))}
        >
          Снять оплату
        </button>
      ) : (
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          disabled={pending || disableAll}
          onClick={() => start(() => call('pay'))}
        >
          Отметить оплаченным
        </button>
      )}

      {/* Отмена/Удаление */}
      {status !== 'cancelled' && status !== 'completed' ? (
        <button
          type="button"
          className="px-3 py-2 rounded-md border text-sm"
          disabled={pending}
          onClick={() => start(() => call('status', { status: 'cancelled' }))}
        >
          Отменить
        </button>
      ) : null}

      <button
        type="button"
        className="px-3 py-2 rounded-md border text-sm"
        disabled={pending}
        onClick={() => start(remove)}
      >
        Удалить
      </button>
    </div>
  );
}

function label(s: string) {
  switch (s) {
    case 'pending': return 'Ожидает';
    case 'paid': return 'Оплачен';
    case 'assigned': return 'Передан исполнителю';
    case 'in_progress': return 'В работе';
    case 'completed': return 'Выполнен';
    case 'cancelled': return 'Отменён';
    default: return s;
  }
}
