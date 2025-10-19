// app/requests/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Image from 'next/image';
import Link from 'next/link';
import OpenChatButton from '@/components/OpenChatButton';

type Row = {
  id: string;
  listing_id: string | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;

  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;

  owner_id_for_chat: string | null;
  chat_id: string | null;
};

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

function formatDateRange(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const s = new Date(a);
  const e = new Date(b);
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt.format(s)} — ${fmt.format(e)}`;
}

export default async function Page() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/requests/mine`, {
    cache: 'no-store',
  });
  const data = (await res.json()) as { rows?: Row[]; error?: string; message?: string };

  if (data?.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Мои заявки</h1>
        <div className="rounded-xl border p-4 text-red-600">
          Ошибка: {data.error}
          {data.message ? ` — ${data.message}` : null}
        </div>
      </div>
    );
  }

  const rows = data.rows ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Мои заявки</h1>

      {rows.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Заявок пока нет.
        </div>
      ) : null}

      {rows.map((r) => {
        const period = formatDateRange(r.start_date, r.end_date);

        return (
          <div key={r.id} className="rounded-2xl border p-3 flex gap-4 items-stretch">
            <div className="w-40 h-28 overflow-hidden rounded-lg bg-muted shrink-0">
              {r.cover_url ? (
                <Image
                  src={r.cover_url}
                  alt={r.listing_title ?? 'Фото'}
                  width={320}
                  height={224}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold leading-tight">{r.listing_title ?? 'Объявление'}</div>
              <div className="text-sm text-muted-foreground">{r.listing_city ?? '—'}</div>
              {period ? <div className="text-sm">{period}</div> : null}

              <div className="mt-2 text-xs text-muted-foreground">
                {r.chat_id || (r.listing_id && r.owner_id_for_chat) ? (
                  <span>Для уточнений используйте чат.</span>
                ) : (
                  <span>Чат появится, когда у заявки будет известен владелец.</span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right flex flex-col items-end gap-2">
              <div className="text-sm">
                {r.monthly_price != null ? <b>{money(r.monthly_price)}</b> : null}
                {r.deposit != null ? (
                  <span className="text-muted-foreground ml-2">
                    Залог: {money(r.deposit)}
                  </span>
                ) : null}
              </div>

              <div className="text-xs text-amber-600">
                {r.status} · {r.payment_status}
              </div>

              {r.chat_id ? (
                <Link
                  href={`/chat/${r.chat_id}`}
                  className="px-3 py-1 border rounded-md text-sm hover:bg-muted"
                >
                  Открыть чат
                </Link>
              ) : r.listing_id && r.owner_id_for_chat ? (
                <OpenChatButton
                  listingId={r.listing_id}
                  otherId={r.owner_id_for_chat}
                  label="Открыть чат"
                />
              ) : (
                <div className="text-xs text-muted-foreground">Чат недоступен</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
