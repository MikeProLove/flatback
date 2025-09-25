'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number;
  deposit: number;
  created_at: string;
  listing_id: string | null;
  owner_id: string | null;
  tenant_id: string | null;
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;
};

const money = (v: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    Number.isFinite(v) ? v : 0
  );
const safeDate = (d: any) => {
  const dt = new Date(String(d));
  return Number.isFinite(+dt) ? dt.toLocaleDateString('ru-RU') : '—';
};

export default function IncomingRequestsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    try {
      const res = await fetch('/api/requests/incoming', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || res.statusText);
      setRows(j.rows ?? []);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const act = async (id: string, action: 'approve' | 'decline' | 'mark_paid' | 'refund') => {
    const res = await fetch('/api/requests/owner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) reload();
    else alert('Не удалось выполнить действие');
  };

  if (err) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Заявки на мои</h1>
        <div className="rounded-2xl border p-6 text-red-600 text-sm">Ошибка: {err}</div>
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Заявки на мои</h1>
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Загружаем…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Заявки на мои</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Пока нет входящих заявок.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const total = (Number(r.monthly_price) || 0) + (Number(r.deposit) || 0);
            return (
              <div key={r.id} className="rounded-2xl border overflow-hidden">
                <div className="grid grid-cols-[160px_1fr] gap-0">
                  <div className="bg-muted">
                    {r.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <a
                          href={r.listing_id ? `/listings/${r.listing_id}` : '#'}
                          className="font-medium hover:underline"
                        >
                          {r.listing_title ?? 'Объявление'}
                        </a>
                        <div className="text-sm text-muted-foreground">{r.listing_city ?? '—'}</div>
                        <div className="text-xs">
                          {safeDate(r.start_date)} — {safeDate(r.end_date)}
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="font-semibold">{money(Number(r.monthly_price) || 0)} / мес</div>
                        {r.deposit ? (
                          <div className="text-muted-foreground">Залог: {money(Number(r.deposit))}</div>
                        ) : null}
                        <div className="text-xs">
                          <span
                            className={
                              r.status === 'approved'
                                ? 'text-green-600'
                                : r.status === 'declined'
                                ? 'text-red-600'
                                : r.status === 'cancelled'
                                ? 'text-gray-500'
                                : 'text-yellow-600'
                            }
                          >
                            {r.status}
                          </span>
                          {' · '}
                          <span
                            className={
                              r.payment_status === 'paid'
                                ? 'text-green-600'
                                : r.payment_status === 'refunded'
                                ? 'text-gray-600'
                                : 'text-yellow-600'
                            }
                          >
                            {r.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Кнопки действий владельца */}
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => act(r.id, 'approve')} className="px-3 py-1 border rounded-md text-sm">
                            Одобрить
                          </button>
                          <button onClick={() => act(r.id, 'decline')} className="px-3 py-1 border rounded-md text-sm">
                            Отклонить
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && r.payment_status !== 'paid' && (
                        <button onClick={() => act(r.id, 'mark_paid')} className="px-3 py-1 border rounded-md text-sm">
                          Отметить оплаченной ({money(total)})
                        </button>
                      )}
                      {r.payment_status === 'paid' && (
                        <button onClick={() => act(r.id, 'refund')} className="px-3 py-1 border rounded-md text-sm">
                          Вернуть оплату
                        </button>
                      )}

                      {/* Чат по заявке */}
                      <a href={`/chats/${r.id}`} className="ml-auto text-sm underline">
                        Открыть чат
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
