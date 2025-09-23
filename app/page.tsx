// app/page.tsx
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type ListingRow = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
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

  // 1) берём последние объявления И cover_url из вьюхи
  const { data } = await sb
    .from('listings_with_cover')
    .select('id,owner_id,user_id,title,price,city,rooms,area_total,cover_url,created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  const listings = (data ?? []) as ListingRow[];

  // 2) Fallback: если у карточки нет cover_url, берём первый файл из Storage
  const fallback = new Map<string, string>();
  const tasks = listings
    .filter((l) => !l.cover_url)
    .map(async (l) => {
      const owner = l.owner_id || l.user_id;
      if (!owner) return;
      const prefix = `${owner}/${l.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 1 });
      const first = list?.data?.[0];
      if (first) {
        const fullPath = `${prefix}/${first.name}`;
        const pub = sb.storage.from('listings').getPublicUrl(fullPath);
        fallback.set(l.id, pub.data.publicUrl);
      }
    });
  await Promise.all(tasks);

  return { listings, fallback };
}

export default async function HomePage() {
  const { listings, fallback } = await getLatest();

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
            {listings.map((l) => {
              const cover = l.cover_url || fallback.get(l.id);
              return (
                <a
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="rounded-2xl border hover:shadow transition overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
