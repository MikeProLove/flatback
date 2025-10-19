'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { createBrowserClient } from '@supabase/ssr';

type Props = {
  listingId: string;
  price: number;
  deposit: number | null;
};

function makeSb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function BookWidget({ listingId, price, deposit }: Props) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setErr(null);
    setOk(false);

    if (!userId) {
      setErr('not_authenticated');
      return;
    }
    if (!listingId) {
      setErr('no_listing');
      return;
    }

    setLoading(true);
    try {
      const sb = makeSb();
      const { error } = await sb.from('bookings_base').insert([
        {
          listing_id: listingId,          // uuid объявления
          start_date: start || null,      // 'YYYY-MM-DD' либо null
          end_date: end || null,          // 'YYYY-MM-DD' либо null
          renter_id: userId,              // ВАЖНО: Clerk userId (строка)
          monthly_price: price || null,
          deposit: deposit ?? null,
        },
      ]);

      if (error) throw error;
      setOk(true);
      // при желании: router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'db_error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full border rounded px-4 py-3 font-medium disabled:opacity-60"
      >
        {loading ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      {err && <div className="text-red-600 text-sm">{err}</div>}
      {ok && <div className="text-green-600 text-sm">Заявка отправлена</div>}
    </div>
  );
}
