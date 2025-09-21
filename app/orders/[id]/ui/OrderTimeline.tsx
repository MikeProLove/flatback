// app/orders/[id]/ui/OrderTimeline.tsx
import React from 'react';

type EventRow = {
  id: string;
  created_at: string;
  kind: string;
  payload: any;
};

export default function OrderTimeline({ events }: { events: EventRow[] }) {
  if (!events.length) return null;

  return (
    <div className="rounded-2xl border">
      <div className="p-4 font-medium">История</div>
      <div className="divide-y">
        {events.map((ev) => (
          <div key={ev.id} className="p-4 text-sm flex items-start gap-3">
            <div className="w-48 text-muted-foreground">
              {new Date(ev.created_at).toLocaleString('ru-RU')}
            </div>
            <div className="flex-1">
              {renderEvent(ev)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderEvent(ev: EventRow) {
  switch (ev.kind) {
    case 'created':
      return <>Заказ создан{ev.payload?.amount ? <> на сумму <b>{fmt(ev.payload.amount)}</b></> : null}.</>;
    case 'paid':
      return <>Отмечен оплаченным{ev.payload?.status_to ? <> (статус: <b>{label(ev.payload.status_to)}</b>)</> : null}.</>;
    case 'unpaid':
      return <>Оплата снята{ev.payload?.status_to ? <> (статус: <b>{label(ev.payload.status_to)}</b>)</> : null}.</>;
    case 'status_changed':
      return <>Статус изменён: <b>{label(ev.payload?.status_from)}</b> → <b>{label(ev.payload?.status_to)}</b>.</>;
    case 'items_replaced':
      return <>Состав заказа обновлён ({ev.payload?.items_count ?? 0} позиций){ev.payload?.amount ? <>. Итог: <b>{fmt(ev.payload.amount)}</b></> : null}.</>;
    case 'deleted':
      return <>Заказ удалён.</>;
    default:
      return <>{ev.kind}</>;
  }
}

function label(s?: string) {
  switch (s) {
    case 'pending': return 'Ожидает';
    case 'paid': return 'Оплачен';
    case 'assigned': return 'Передан исполнителю';
    case 'in_progress': return 'В работе';
    case 'completed': return 'Выполнен';
    case 'cancelled': return 'Отменён';
    default: return s ?? '';
  }
}

function fmt(n: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(n) || 0);
  } catch {
    return String(n);
  }
}
