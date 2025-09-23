// app/page.tsx
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  created_at: string;
};

async function getLatest() {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  return { listings: (data ?? []) as ListingRow[] };
}

export default async function HomePage() {
  const { listings } = await getLatest();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Flatback</h1>
        <p className="text-sm text-muted-foreground">
          Добро пожаловать! Размещайте и находите объявления об аренде.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-medium">Новые объявления</div>
          <a href="/listings" className="text-sm underline">Все объявления</a>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            Пока пусто. <a href="/listings/create" className="underline">Создать объявление</a>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <a
                key={l.id}
                href={`/listings/${l.id}`}
                className="rounded-2xl border hover:shadow transition overflow-hidden"
              >
                {/* обложка */}
                <div className="aspect-[4/3] bg-muted">
                  {l.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                </div>

                {/* контент */}
                <div className="p-4 space-y-1">
                  <div className="text-base font-semibold">{l.title ?? 'Объявление'}</div>
                  <div className="text-sm text-muted-foreground">
                    {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                  </div>
                  <div className="text-base font-semibold">
                    {money(Number(l.price) || 0)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
