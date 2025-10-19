'use client';
import { useState } from 'react';

export default function BookWidget({
  listingId,
  price,
  deposit,
}: { listingId: string; price: number; deposit: number | null }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    setErr(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          start_date: start || null,
          end_date: end || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'db_error');
      setOk(true);
    } catch (e: any) {
      setErr(e.message || 'db_error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* ваши поля дат */}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl border px-4 py-3"
      >
        {loading ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      {ok && <div className="text-green-600 text-sm">Заявка отправлена.</div>}
      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}
