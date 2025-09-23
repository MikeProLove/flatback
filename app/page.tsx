// app/page.tsx
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  created_at: string;
};

async function getLatest() {
  const sb = getSupabaseAdmin();

  // последние 6 объявлений
  const { data: listings } = await sb
    .from('listings')
    .select('id,owner_id,user_id,title,price,city,rooms,area_total,created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  const cover = new Map<string, string>();

  if (listings?.length) {
    // 1) пробуем взять обложки из таблицы listing_photos
    const ids = listings.map((l) => l.id);
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing_id', ids)
      .order('sort_order', { ascending: true });

    for (const p of (photos ?? []) as Array<{ listing_id: string; url: string }>) {
      if (!cover.has(p.listing_id)) cover.set(p.listing_id, p.url);
    }

    // 2) fallback: если обложки нет — берём первый файл из Storage
    for (const l of listings as Listing[]) {
      if (!cover.has(l.id)) {
        const owner = l.owner_id || l.user_id;
        if (!owner) continue;
        const prefix = `${owner}/${l.id}`;
        const list = await sb.storage.from('listings').list(prefix, { limit: 1 });
        if (!list?.error && list?.data?.[0]) {
          const fullPath = `${prefix}/${list.data[0].name}`;
          const pub = sb.storage.from('listings').getPublicUrl(fullPath);
          cover.set(l.id, pub.data.publicUrl);
        }
      }
    }
  }

  return { listings: (listings ?? []) as Listing[], cover };
}

export default async function HomePage() {
  const { listings, cover } = await getLatest();

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
          <a href="/listings" className="text-sm underline">
            Все объявления
          </a>
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
                  {cover.get(l.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.get(l.id)!}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
