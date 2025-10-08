'use client';

import { useState, useTransition } from 'react';

function money(n: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
      n || 0
    );
  } catch {
    return `${Math.round(n || 0)} ₽`;
  }
}

export default function BookWidget({
  listingId,
  price,
  deposit,
}: {
  listingId: string;
  price: number;
  deposit: number | null;
}) {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [pending, startTr] = useTransition();
  const total = price + (deposit ?? 0);

  return (
    <div className="space-y-3">
      <div className="font-medium">Забронировать</div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="c"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="по"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        Аренда: <b>{money(price)}</b>
        {deposit ? (
          <>
            {' '}
            · Залог: <b>{money(deposit)}</b>
          </>
        ) : null}
      </div>

      <button
        disabled={pending || !start || !end}
        onClick={() =>
          startTr(async () => {
            try {
              const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  listing_id: listingId,
                  start_date: start,
                  end_date: end,
                  monthly_price: price,
                  deposit: deposit ?? 0,
                }),
              });
              if (!res.ok) throw new Error(await res.text());
              alert(`Заявка отправлена. Сумма к оплате после подтверждения: ${money(total)}`);
            } catch (e: any) {
              alert(e?.message || 'Не удалось отправить заявку');
            }
          })
        }
        className="w-full rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
      >
        Отправить заявку
      </button>
    </div>
  );
}
