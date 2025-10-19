'use client';

import { useState } from 'react';

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    try {
      setBusy(true);
      setErr(null);
      setOk(null);

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          start_date: start || null,
          end_date: end || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || j?.error || 'Не удалось отправить заявку');

      setOk('Заявка отправлена!');
      // мягкий редирект в "Мои заявки", чтобы пользователь сразу видел результат
      setTimeout(() => {
        window.location.href = '/requests';
      }, 400);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка отправки');
    } finally {
      setBusy(false);
    }
  }

  const money = (n?: number | null) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
      Number(n ?? 0)
    );

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Стоимость: <b>{money(price)}</b>
        {typeof deposit === 'number' ? (
          <span> · Залог: <b>{money(deposit)}</b></span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm">
          Дата заезда
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="block mt-1 w-full border rounded-md px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Дата выезда
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="block mt-1 w-full border rounded-md px-3 py-2"
          />
        </label>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}
      {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full px-4 py-2 border rounded-md hover:bg-muted disabled:opacity-60"
      >
        {busy ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </div>
  );
}
