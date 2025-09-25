// app/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import FavoriteButton from '@/app/listings/FavoriteButton';
import { money } from '@/lib/format';

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
  const { data } = await sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(9);

  const listings = (data ?? []) as ListingRow[];

  // Fallback cover
  const fallback = new Map<string, string>();
  const tasks = listings.filter(l => !l.cover_url).map(async (l) => {
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

  // Избранное для текущего пользователя
  const { userId } = auth();
  const favSet = new Set<string>();
  if (userId && listings.length) {
    const ids = listings.map(l => l.id);
    const { data: favs } = await sb
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', ids);
    (favs ?? []).forEach(f => favSet.add(f.listing_id));
  }

  return { listings, fallback, favSet };
}

export default async function HomePage() {
  const { listings, fallback, favSet } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Flatback</h1>
      <p className="text-muted-foreground">Добро пожаловать! Размещайте и находите объявления об аренде.</p>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Новые объявления</h2>
        <a href="/listings" className="text-sm underline">Все объявления</a>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет объявлений. <a href="/listings/create" className="underline">Создайте первое</a>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => {
            const cover = l.cover_url || fallback.get(l.id);
            const fav = favSet.has(l.id);
            return (
              <div key={l.id} className="rounded-2xl border hover:shadow transition overflow-hidden relative">
                <div className="absolute top-2 right-2 z-10">
                  <FavoriteButton listingId={l.id} initial={fav} />
                </div>
                <a href={`/listings/${l.id}`}>
                  <div className="aspect-[4/3] bg-muted">
                    {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-lg font-semibold">{l.title ?? 'Объявление'}</div>
                    <div className="text-sm text-muted-foreground">
                      {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                    </div>
                    <div className="text-base font-semibold">{money(Number(l.price) || 0)}</div>
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
