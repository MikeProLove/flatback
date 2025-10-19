// app/requests/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import * as React from 'react';
import Link from 'next/link';
import OpenChatButton from '@/components/OpenChatButton';

type RequestRow = {
  id: string;
  listing_id: string | null;
  // даты
  start_date: string | null;
  end_date: string | null;
  // цены
  monthly_price: number | null;
  deposit: number | null;
  // статусы
  status: string | null;
  payment_status: string | null;
  // витринные данные объявления
  listing_title?: string | null;
  listing_city?: string | null;
  listing_cover?: string | null;
  // для чата (может отсутствовать)
  other_id_for_chat?: string | null; // кого приглашать в чат
};

function fmtDateRange(a?: string | null, b?: string | null) {
  if (!a || !b) return '—';
  try {
    const da = new Date(a);
    const db = new Date(b);
    const f = new Intl.DateTimeFormat('ru-RU');
    return `${f.format(da)} — ${f.format(db)}`;
  } catch {
    return '—';
  }
}

function money(n?: number | null, cur: string = 'RUB') {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur as any,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} ₽`;
  }
}

async function fetchMyRequests(): Promise<{
  rows: RequestRow[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/requests/mine', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      // попробуем достать сообщение
      if (ct.includes('application/json')) {
        const j = await res.json().catch(() => ({}));
        return { rows: [], error: j?.message || j?.error || `HTTP ${res.status}` };
      } else {
        const t = await res.text().catch(() => '');
        return { rows: [], error: t?.slice(0, 300) || `HTTP ${res.status}` };
      }
    }

    if (ct.includes('application/json')) {
      const j = (await res.json()) as { items?: RequestRow[] } | RequestRow[];
      const rows = Array.isArray(j) ? (j as RequestRow[]) : (j.items ?? []);
      return { rows: rows.filter(Boolean) };
    }

    // пришёл не JSON
    const t = await res.text().catch(() => '');
    return { rows: [], error: t?.slice(0, 300) || 'unexpected_response' };
  } catch (e: any) {
    return { rows: [], error: e?.message || 'network_error' };
  }
}

export default async function RequestsPage() {
  const { rows, error } = await fetchMyRequests();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Мои заявки</h1>

      {/* Ошибка – не падаем, показываем аккуратно */}
      {error ? (
        <div className="rounded-lg border p-3 text-sm text-red-600">
          Ошибка: {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Заявок пока нет.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const cover = r.listing_cover || '';
            const title = r.listing_title || 'Объявление';
            const city = r.listing_city || '—';
            const dr = fmtDateRange(r.start_date, r.end_date);

            return (
              <div
                key={r.id}
                className="flex gap-4 rounded-xl border p-3 md:p-4"
              >
                {/* картинка (простая <img>, чтобы не упасть из-за доменов для next/image) */}
                <div className="w-36 h-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{title}</div>
                      <div className="text-sm text-muted-foreground">{city}</div>
                      <div className="text-sm text-muted-foreground">{dr}</div>
                    </div>

                    <div className="text-right text-sm">
                      {r.monthly_price != null ? (
                        <div className="font-medium">{money(r.monthly_price)}</div>
                      ) : null}
                      {r.deposit != null ? (
                        <div className="text-muted-foreground">
                          Залог: {money(r.deposit)}
                        </div>
                      ) : null}
                      <div className="text-xs text-amber-700">
                        {r.status ?? 'pending'} · {r.payment_status ?? 'pending'}
                      </div>
                    </div>
                  </div>

                  {/* действия */}
                  <div className="mt-2 flex items-center gap-2">
                    {r.listing_id ? (
                      <Link
                        href={`/listings/${r.listing_id}`}
                        className="text-sm underline"
                      >
                        Открыть объявление
                      </Link>
                    ) : null}

                    {/* Кнопка чата – только если известен другой участник */}
                    {r.other_id_for_chat ? (
                      <OpenChatButton
                        listingId={r.listing_id!}
                        otherId={r.other_id_for_chat}
                        label="Открыть чат"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Чат появится, когда у заявки будет известен владелец.
                      </div>
                    )}
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
