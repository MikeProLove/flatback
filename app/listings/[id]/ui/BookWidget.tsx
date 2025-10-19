'use client';

import { useState } from 'react';

export default function BookWidget(props: {
  listingId: string;
  price: number;
  deposit: number | null;
}) {
  const { listingId, price, deposit } = props;

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
          monthly_price: price,
          deposit: deposit ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || j?.error || 'Не удалось отправить');

      setOk('Заявка отправлена!');
      // можно сразу перекинуть в «Мои заявки»
      setTimeout(() => {
        window.location.href = '/requests';
      }, 600);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Укажите желаемые даты (необязательно) и отправьте заявку владельцу.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="w-full px-3 py-2 border rounded-md hover:bg-muted disabled:opacity-50"
      >
        {busy ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}
      {ok ? <div className="text-sm text-green-600">{ok}</div> : null}
    </div>
  );
}
