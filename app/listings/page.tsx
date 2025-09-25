// app/listings/page.tsx
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { money } from '@/lib/format';
import SearchBar from './SearchBar';
import SaveSearchButton from './SaveSearchButton';
import FavoriteButton from './FavoriteButton';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
@@ -25,14 +25,8 @@ type ListingRow = {
};

type SP = Record<string, string | string[] | undefined>;

const num = (v?: string) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const take = (sp: SP, key: string) =>
  typeof sp[key] === 'string' ? (sp[key] as string) : undefined;
const take = (sp: SP, key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);
const num = (v?: string) => (v && Number.isFinite(+v) ? +v : null);
const sanitizeLike = (s: string) => s.replace(/[%_]/g, '\\$&').replace(/,/g, ' ');

async function getData(sp: SP) {
@@ -45,22 +39,18 @@ async function getData(sp: SP) {

  let q = sb
    .from('listings_with_cover')
    .select(
      'id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id',
      { count: 'exact' }
    )
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id', { count: 'exact' })
    .eq('status', 'published');

  const qraw = (take(sp, 'q') || '').trim();
  if (qraw) {
    const pat = `%${sanitizeLike(qraw)}%`;
    const or = [
    q = q.or([
      `title.ilike.${pat}`,
      `city.ilike.${pat}`,
      `address.ilike.${pat}`,
      `description.ilike.${pat}`,
    ].join(',');
    q = q.or(or);
    ].join(','));
  }

  const city = (take(sp, 'city') || '').trim();
@@ -83,65 +73,55 @@ async function getData(sp: SP) {
  if (withPhotos) q = q.not('cover_url', 'is', null);

  const sort = take(sp, 'sort') || 'latest';
  if (sort === 'price_asc') {
    q = q.order('price', { ascending: true, nullsFirst: true });
  } else if (sort === 'price_desc') {
    q = q.order('price', { ascending: false, nullsFirst: false });
  } else if (sort === 'area_desc') {
    q = q.order('area_total', { ascending: false, nullsFirst: false });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
  else if (sort === 'area_desc') q = q.order('area_total', { ascending: false, nullsFirst: false });
  else q = q.order('created_at', { ascending: false });

  const { data, count } = await q.range(from, to);
  const listings = (data ?? []) as ListingRow[];

  // Fallback для карточек без cover_url
  // fallback для cover
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

  const total = count ?? listings.length;
  const hasNext = from + listings.length < total;
  const hasPrev = page > 1;

  return { listings, fallback, page, hasPrev, hasNext, total, per };
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const { listings, fallback, page, hasPrev, hasNext } = await getData(searchParams);

  // auth для начального состояния избранного
  // избранное начальное
  const { userId } = auth();
  const sb = getSupabaseAdmin();
  const favSet = new Set<string>();
  if (userId && listings.length) {
    const ids = listings.map((l) => l.id);
    const ids = listings.map(l => l.id);
    const { data: favs } = await sb
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', ids);
    (favs ?? []).forEach((f) => favSet.add(f.listing_id));
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
  for (const k of [
    'q','city','rooms','price_min','price_max','area_min','area_max','sort','with_photos',
  ]) {
  for (const k of ['q','city','rooms','price_min','price_max','area_min','area_max','sort','with_photos']) {
    const v = take(searchParams, k);
    if (typeof v === 'string') initial[k] = v;
  }
@@ -182,8 +162,8 @@ export default async function ListingsPage({ searchParams }: { searchParams: SP
              const fav = favSet.has(l.id);
              return (
                <div key={l.id} className="rounded-2xl border hover:shadow transition overflow-hidden relative">
                  {/* Сердечко в углу */}
                  <div className="absolute top-2 right-2 z-10">
                  {/* Сердечко вне <a>, поверх карточки */}
                  <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                    <FavoriteButton listingId={l.id} initial={fav} />
                  </div>

@@ -207,19 +187,10 @@ export default async function ListingsPage({ searchParams }: { searchParams: SP
            })}
          </div>

          {/* Пагинация */}
          <div className="flex items-center justify-center gap-3 pt-4">
            {hasPrev ? (
              <a href={pageURL(page - 1)} className="px-3 py-1 border rounded-md text-sm">
                Назад
              </a>
            ) : null}
            {hasPrev ? <a href={pageURL(page - 1)} className="px-3 py-1 border rounded-md text-sm">Назад</a> : null}
            <div className="text-sm text-muted-foreground">Стр. {page}</div>
            {hasNext ? (
              <a href={pageURL(page + 1)} className="px-3 py-1 border rounded-md text-sm">
                Вперёд
              </a>
            ) : null}
            {hasNext ? <a href={pageURL(page + 1)} className="px-3 py-1 border rounded-md text-sm">Вперёд</a> : null}
          </div>
        </>
      )}
