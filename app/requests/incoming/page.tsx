// app/requests/incoming/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import OpenChatButton from '@/components/OpenChatButton';
import { apiFetch } from '@/lib/absolute-url';

type Item = {
  id: string;
  listing_id: string | null;
  title?: string | null;
  city?: string | null;
  cover_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  monthly_price?: number | null;
  deposit?: number | null;
  status?: string | null;
  payment_status?: string | null;
  chat_id?: string | null;
  chat_path?: string | null;
  other_id?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}

export default async function Page() {
  let items: Item[] = [];
  let errorMsg: string | null = null;

  try {
    const res = await apiFetch('/api/requests/incoming');
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errorMsg = `HTTP ${res.status}${text ? ` — ${text}` : ''}`;
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error) {
        errorMsg = String(data.error);
      } else {
        items = Array.isArray(data?.items) ? (data.items as Item[]) : [];
      }
    }
  } catch (e: any) {
    errorMsg = e?.message ?? 'fetch_error';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Заявки на мои</h1>

      {errorMsg ? (
        <div className="mb-4 rounded-xl border p-4 text-red-600">
          Ошибка: {errorMsg}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Заявок пока нет.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border p-4 flex gap-4">
              <div className="w-40 h-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {it.cover_url ? (
                  <img
                    src={it.cover_url}
                    alt={it.title ?? 'Фото'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-medium truncate">
                    {it.title ?? 'Объявление'}
                  </div>
                  {it.city ? <div className="text-sm text-muted-foreground">· {it.city}</div> : null}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(it.start_date)} — {fmtDate(it.end_date)}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {typeof it.monthly_price === 'number' ? (
                    <span>{new Intl.NumberFormat('ru-RU').format(it.monthly_price)} ₽ / мес</span>
                  ) : null}
                  {typeof it.deposit === 'number' ? (
                    <span className="text-muted-foreground">
                      Залог: {new Intl.NumberFormat('ru-RU').format(it.deposit)} ₽
                    </span>
                  ) : null}
                  {it.status ? <span className="text-orange-600">{it.status}</span> : null}
                  {it.payment_status ? <span className="text-orange-600">{it.payment_status}</span> : null}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {it.chat_path ? (
                    <Link href={it.chat_path} className="px-3 py-1.5 rounded border hover:bg-gray-50">
                      Открыть чат
                    </Link>
                  ) : it.listing_id ? (
                    <OpenChatButton
                      listingId={it.listing_id}
                      otherId={it.other_id ?? undefined}
                      label="Открыть чат"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
