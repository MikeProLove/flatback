'use client';

import { useState } from 'react';

type Props = {
  listingId: string;
  price?: number | null;
  deposit?: number | null;
};

export default function BookWidget({ listingId }: Props) {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate: start || null,
          endDate: end || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'server_error');
      setOk(true);
    } catch (e: any) {
      setErr(e.message || 'unknown_error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Укажите желаемые даты (необязательно) и отправьте заявку владельцу.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="date"
          className="w-full rounded-xl border px-3 py-2"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="w-full rounded-xl border px-3 py-2"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl border px-4 py-3 text-lg font-medium disabled:opacity-60"
      >
        {loading ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      {ok && (
        <div className="text-green-600 text-sm">
          Заявка отправлена! Посмотрите в разделах «Мои заявки» и «Заявки на мои».
        </div>
      )}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </form>
  );
}
