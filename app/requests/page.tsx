'use client';

import { useEffect, useState } from 'react';
import ChatOpenButton from '@/app/listings/[id]/ui/ChatOpenButton';

type Row = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;

  // пришло из API
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;
  owner_id_for_chat: string | null;
};

function money(val: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
      .format(Number.isFinite(val) ? val : 0);
  } catch {
    return `${Math.round(val || 0)} ₽`;
  }
}
function safeDate(d: any): string {
  const dt = new Date(String(d));
  return Number.isFinite(+dt) ? dt.toLocaleDateString('ru-RU') : '—';
}

export default function RequestsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch('/api/requests/my', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || 'load_failed');
      setRows(j.rows ?? []);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
      setRows([]);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Мои заявки</h1>
        <div className="rounded-2xl border p-6 text-sm text-red-600">Ошибка: {String(err)}</div>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Мои заявки</h1>
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Загружаем…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Мои заявки</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">У вас пока нет заявок.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const canPay = r.status === 'approved' && r.payment_status !== 'paid';
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

                    <div className="pt-2 flex flex-wrap gap-8 items-center">
                      {/* Кнопка чата: корректно открывает существующий или создаёт новый */}
                      {r.listing_id && r.owner_id_for_chat ? (
                        <ChatOpenButton ownerId={r.owner_id_for_chat} listingId={r.listing_id} />
                      ) : null}

                      {/* Отмена заявки в ожидании */}
                      {r.status === 'pending' ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/bookings/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'cancel' }),
                            });
                            if (res.ok) location.reload();
                            else alert('Не удалось отменить');
                          }}
                          className="px-3 py-1 border rounded-md text-sm"
                        >
                          Отменить
                        </button>
                      ) : null}

                      {/* Оплата при одобрении */}
                      {canPay ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/bookings/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'pay', method: 'card' }), // mock-оплата
                            });
                            if (res.ok) location.reload();
                            else alert('Оплата не прошла');
                          }}
                          className="px-4 py-2 border rounded-md text-sm"
                        >
                          Оплатить {money(total)}
                        </button>
                      ) : null}
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
