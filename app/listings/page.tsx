// app/listings/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import FavoriteButton from './FavoriteButton';
import { auth } from '@clerk/nextjs/server';

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
  status: string;
};

async function getData() {
  const sb = getSupabaseAdmin();
  const { userId } = auth();

  // 1) берём опубликованные лоты + cover из вьюхи
  const { data, error } = await sb
    .from('listings_with_cover')
    .select(
      'id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id'
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    return { listings: [] as ListingRow[], fallback: new Map<string, string>(), favSet: new Set<string>(), err: error.message };
  }

  const listings = (data ?? []) as ListingRow[];

  // 2) фолбэк: если cover_url нет — берём первую фотку из storage
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
        const url = sb.storage.from('listings').getPublicUrl(`${prefix}/${first.name}`).data.publicUrl;
        fallback.set(l.id, url);
      }
    });
  await Promise.all(tasks);

  // 3) избранное текущего пользователя (для начального состояния сердечек)
  const favSet = new Set<string>();
  if (userId && listings.length) {
    const ids = listings.map((l) => l.id);
    const { data: favs } = await sb
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', ids);
    (favs ?? []).forEach((f) => favSet.add(String(f.listing_id)));
  }

  return { listings, fallback, favSet, err: null as string | null };
}

export default async function ListingsPage() {
  const { listings, fallback, favSet, err } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Объявления</h1>

      {err ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">
          Ошибка загрузки: {err}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет объявлений. <a href="/listings/create" className="underline">Создайте первое</a>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const cover = l.cover_url || fallback.get(l.id) || null;
            const isFav = favSet.has(l.id);

            return (
              <div
                key={l.id}
                className="rounded-2xl border hover:shadow transition overflow-hidden relative"
              >
                {/* Избранное */}
                <div className="absolute top-2 right-2 z-10">
                  <FavoriteButton listingId={l.id} initial={isFav} />
                </div>

                <a href={`/listings/${l.id}`}>
                  <div className="aspect-[4/3] bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="text-lg font-semibold">
                      {l.title ?? 'Объявление'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                    </div>
                    <div className="text-base font-semibold">
                      {money(Number(l.price) || 0)}
                    </div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
