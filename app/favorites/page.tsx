// app/favorites/page.tsx
export const dynamic = 'force-dynamic';

import { money } from '@/lib/format';

async function getData() {
  const res = await fetch('/api/favorites/my', { cache: 'no-store' }).catch(() => null);
  if (!res || !res.ok) return { rows: [] as any[] };
  const j = await res.json();
  return { rows: (j.rows ?? []) as any[] };
}

export default async function FavoritesPage() {
  const { rows } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Избранное</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Список пуст. Откройте <a className="underline" href="/listings">объявления</a> и добавьте некоторые в избранное.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((l) => (
            <a key={l.id} href={`/listings/${l.id}`} className="rounded-2xl border hover:shadow transition overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                {l.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="p-4 space-y-2">
                <div className="text-lg font-semibold">{l.title ?? 'Объявление'}</div>
                <div className="text-sm text-muted-foreground">
                  {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                </div>
                <div className="text-base font-semibold">{money(Number(l.price) || 0)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
