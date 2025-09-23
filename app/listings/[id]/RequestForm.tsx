'use client';

import { useState } from 'react';

export default function RequestForm({
  listingId,
}: {
  listingId: string;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate: start,
          endDate: end,
          message: msg || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data || 'Ошибка');
      setDone(data.id || 'ok');
    } catch (e: any) {
      setErr(e?.message || 'Не удалось отправить заявку');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border p-4">
        <div className="font-medium mb-1">Заявка отправлена</div>
        <div className="text-sm text-muted-foreground">
          Мы уведомили владельца. Статус можно смотреть в разделе <a className="underline" href="/requests">«Мои заявки»</a>.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="font-medium">Запросить аренду</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm">Дата заезда</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full border rounded-md px-3 py-2" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Дата выезда</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full border rounded-md px-3 py-2" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm">Сообщение владельцу (необязательно)</label>
        <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full border rounded-md px-3 py-2" />
      </div>
      {err ? <div className="text-sm text-red-600">{err}</div> : null}
      <div className="flex justify-end">
        <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-md border">
          {busy ? 'Отправляем…' : 'Отправить заявку'}
        </button>
      </div>
    </div>
  );
}
