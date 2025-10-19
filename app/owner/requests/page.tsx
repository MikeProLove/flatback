export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { absoluteUrl, authHeaders } from '@/lib/absolute-url';
import OpenChatButton from '@/components/OpenChatButton';
import Image from 'next/image';

type Item = {
  id: string;
  listing_id: string;
  renter_id_for_chat?: string | null;

  title?: string | null;
  city?: string | null;
  cover_url?: string | null;

  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  status: string | null;
  payment_status: string | null;
};

async function loadData(): Promise<{ items: Item[]; error?: string }> {
  const url = absoluteUrl('/api/requests/incoming');
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    return { items: [], error: 'bad_json' };
  }

  if (!res.ok) {
    return { items: [], error: data?.message || data?.error || 'api_error' };
  }

  const items: Item[] = data?.items ?? data?.rows ?? data ?? [];
  return { items };
}

export default async function Page() {
  const { items, error } = await loadData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Заявки на мои</h1>

      {error ? (
        <div className="rounded-xl border p-3 text-sm text-red-600">Ошибка: {error}</div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Заявок пока нет.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="flex gap-4 rounded-2xl border p-4">
              <div className="w-44 h-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                {r.cover_url ? (
                  <Image
                    src={r.cover_url}
                    alt=""
                    width={352}
                    height={224}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="flex-1">
                <div className="font-semibold">{r.title ?? 'Объявление'}</div>
                <div className="text-sm text-muted-foreground">{r.city ?? '—'}</div>
                <div className="text-sm mt-1">
                  {r.start_date && r.end_date ? (
                    <>
                      {new Date(r.start_date).toLocaleDateString('ru-RU')} —{' '}
                      {new Date(r.end_date).toLocaleDateString('ru-RU')}
                    </>
                  ) : (
                    'Дата не указана'
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {r.status ?? 'pending'} · {r.payment_status ?? 'pending'}
                  </span>

                  {r.listing_id && r.renter_id_for_chat ? (
                    <OpenChatButton
                      listingId={r.listing_id}
                      otherId={r.renter_id_for_chat}
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
