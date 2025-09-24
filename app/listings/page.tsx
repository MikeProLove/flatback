import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import SearchBar from './SearchBar';
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

const num = (v?: string) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const take = (sp: SP, key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);
const sanitizeLike = (s: string) => s.replace(/[%_]/g, '\\$&').replace(/,/g, ' ');

async function getData(sp: SP) {
  const sb = getSupabaseAdmin();

  // пагинация
  const page = Math.max(1, Number(take(sp, 'page')) || 1);
  const per = 24;
  const from = (page - 1) * per;
  const to = from + per - 1;

  // базовый запрос (только опубликованные)
  let q = sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id', { count: 'exact' })
    .eq('status', 'published');

  // строка поиска по нескольким полям
  const qraw = (take(sp, 'q') || '').trim();
  if (qraw) {
    const pat = `%${sanitizeLike(qraw)}%`;
    const or = [
      `title.ilike.${pat}`,
      `city.ilike.${pat}`,
      `address.ilike.${pat}`,
      `description.ilike.${pat}`
    ].join(',');
    q = q.or(or);
  }

  // точные/диапазонные фильтры
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

  // сортировка
    const sort = take(sp, 'sort') || 'latest';
  if (sort === 'price_asc') {
    q = q.order('price', { ascending: true, nullsFirst: true });
  } else if (sort === 'price_desc') {
    q = q.order('price', { ascending: false, nullsFirst: false }); // было nullsLast
  } else if (sort === 'area_desc') {
    q = q.order('area_total', { ascending: false, nullsFirst: false }); // было nullsLast
  } else {
    q = q.order('created_at', { ascending: false });
  }

  // диапазон
  const { data, count } = await q.range(from, to);

  const listings = (data ?? []) as ListingRow[];

  // Fallback для карточек без cover_url
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

  const total = count ?? listings.length;
  const hasNext = from + listings.length < total;
  const hasPrev = page > 1;

  return { listings, fallback, page, hasPrev, hasNext };
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const { listings, fallback, page, hasPrev, hasNext } = await getData(searchParams);

  // Пробросим значения в форму
  const initial: Record<string, string> = {};
  for (const k of ['q','city','rooms','price_min','price_max','area_min','area_max','sort','with_photos']) {
    const v = take(searchParams, k);
    if (typeof v === 'string') initial[k] = v;
  }

  // Навигация страниц
  const qs = new URLSearchParams(initial);
  const pageURL = (p: number) => {
    const params = new URLSearchParams(qs.toString());
    params.set('page', String(p));
    return `/listings?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Объявления</h1>

      <SearchBar initial={initial} />

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Ничего не найдено. Попробуйте изменить фильтры или <a href="/listings" className="underline">сбросить поиск</a>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => {
              const cover = l.cover_url || fallback.get(l.id);
              return (
                <a key={l.id} href={`/listings/${l.id}`} className="rounded-2xl border hover:shadow transition overflow-hidden">
                  <div className="aspect-[4/3] bg-muted relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                    <FavoriteButton listingId={l.id} />
                  </div>  
                  <div className="p-4 space-y-2">
                    <div className="text-lg font-semibold">{l.title ?? 'Объявление'}</div>
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

          {/* Пагинация */}
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
