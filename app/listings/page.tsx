// app/listings/page.tsx
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { money } from '@/lib/format';
import SearchBar from './SearchBar';
import SaveSearchButton from './SaveSearchButton';
import FavoriteButton from './FavoriteButton';

export const runtime = 'nodejs';
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
  status: string;
};

type SP = Record<string, string | string[] | undefined>;
const take = (sp: SP, key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);
const num = (v?: string) => (v && Number.isFinite(+v) ? +v : null);
const sanitizeLike = (s: string) => s.replace(/[%_]/g, '\\$&').replace(/,/g, ' ');

async function getData(sp: SP) {
  const sb = getSupabaseAdmin();

  const page = Math.max(1, Number(take(sp, 'page')) || 1);
  const per = 24;
  const from = (page - 1) * per;
  const to = from + per - 1;

  let q = sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id', { count: 'exact' })
    .eq('status', 'published');

  const qraw = (take(sp, 'q') || '').trim();
  if (qraw) {
    const pat = `%${sanitizeLike(qraw)}%`;
    q = q.or([
      `title.ilike.${pat}`,
      `city.ilike.${pat}`,
      `address.ilike.${pat}`,
      `description.ilike.${pat}`,
    ].join(','));
  }

  const city = (take(sp, 'city') || '').trim();
  if (city) q = q.ilike('city', `%${sanitizeLike(city)}%`);

  const rooms = num(take(sp, 'rooms'));
  if (rooms != null) q = q.eq('rooms', rooms);

  const pmin = num(take(sp, 'price_min'));
  const pmax = num(take(sp, 'price_max'));
  if (pmin != null) q = q.gte('price', pmin);
  if (pmax != null) q = q.lte('price', pmax);

  const amin = num(take(sp, 'area_min'));
  const amax = num(take(sp, 'area_max'));
  if (amin != null) q = q.gte('area_total', amin);
  if (amax != null) q = q.lte('area_total', amax);

  const withPhotos = take(sp, 'with_photos') === '1';
  if (withPhotos) q = q.not('cover_url', 'is', null);

  const sort = take(sp, 'sort') || 'latest';
  if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
  else if (sort === 'area_desc') q = q.order('area_total', { ascending: false, nullsFirst: false });
  else q = q.order('created_at', { ascending: false });

  const { data, count } = await q.range(from, to);
  const listings = (data ?? []) as ListingRow[];

  // fallback для cover
  const fallback = new Map<string, string>();
  const tasks = listings.filter(l => !l.cover_url).map(async (l) => {
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

  // избранное начальное
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

  const total = count ?? listings.length;
  const hasPrev = page > 1;
  const hasNext = from + listings.length < total;

  return { listings, fallback, favSet, page, hasPrev, hasNext, total, per };
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const { listings, fallback, favSet, page, hasPrev, hasNext } = await getData(searchParams);

  const initial: Record<string, string> = {};
  for (const k of ['q','city','rooms','price_min','price_max','area_min','area_max','sort','with_photos']) {
    const v = take(searchParams, k);
    if (typeof v === 'string') initial[k] = v;
  }
  const qsNow = new URLSearchParams(initial).toString();
  const mapHref = qsNow ? `/listings/map?${qsNow}` : '/listings/map';

  const pageURL = (p: number) => {
    const params = new URLSearchParams(initial);
    params.set('page', String(p));
    return `/listings?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Объявления</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Просмотр: <a href="/listings" className="underline">Список</a> ·{' '}
            <a href={mapHref} className="underline">Карта</a>
          </div>
          <SaveSearchButton />
        </div>
      </div>

      <SearchBar initial={initial} />

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Ничего не найдено. Попробуйте изменить фильтры или{' '}
          <a href="/listings" className="underline">сбросить поиск</a>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => {
              const cover = l.cover_url || fallback.get(l.id);
              const fav = favSet.has(l.id);
              return (
                <div key={l.id} className="rounded-2xl border hover:shadow transition overflow-hidden relative">
                  {/* Сердечко вне <a>, поверх карточки */}
                  <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                    <FavoriteButton listingId={l.id} initial={fav} />
                  </div>

                  <a href={`/listings/${l.id}`}>
                    <div className="aspect-[4/3] bg-muted">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            {hasPrev ? <a href={pageURL(page - 1)} className="px-3 py-1 border rounded-md text-sm">Назад</a> : null}
            <div className="text-sm text-muted-foreground">Стр. {page}</div>
            {hasNext ? <a href={pageURL(page + 1)} className="px-3 py-1 border rounded-md text-sm">Вперёд</a> : null}
          </div>
        </>
      )}
    </div>
  );
}
