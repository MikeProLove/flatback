// app/listings/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import FavoriteButton from './FavoriteButton';
import Link from 'next/link';

type Row = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  created_at: string;
  owner_id: string | null;
  user_id: string | null;
};

function take(sp: URLSearchParams, key: string) {
  const v = sp.get(key);
  return v && v.trim() !== '' ? v.trim() : null;
}
function int(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function withParam(sp: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(sp);
  Object.entries(patch).forEach(([k, v]) => {
    if (v === null) next.delete(k);
    else next.set(k, v);
  });
  return `?${next.toString()}`;
}

async function getData(search: string) {
  const sp = new URLSearchParams(search);
  const sb = getSupabaseAdmin();

  const q = take(sp, 'q');
  const city = take(sp, 'city');
  const rooms = int(take(sp, 'rooms'));
  const pmin = int(take(sp, 'price_min'));
  const pmax = int(take(sp, 'price_max'));
  const amin = int(take(sp, 'area_min'));
  const amax = int(take(sp, 'area_max'));
  const onlyPhotos = take(sp, 'with_photos') === '1';
  const sort = take(sp, 'sort') || 'latest';

  const page = Math.max(1, int(take(sp, 'page')) ?? 1);
  const perPage = Math.min(24, Math.max(6, int(take(sp, 'per_page')) ?? 12));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,owner_id,user_id', { count: 'exact', head: false })
    .eq('status', 'published');

  if (city) query = query.ilike('city', `%${city}%`);
  if (rooms !== null) query = query.eq('rooms', rooms);
  if (pmin !== null) query = query.gte('price', pmin);
  if (pmax !== null) query = query.lte('price', pmax);
  if (amin !== null) query = query.gte('area_total', amin);
  if (amax !== null) query = query.lte('area_total', amax);
  if (onlyPhotos) query = query.not('cover_url', 'is', null);

  if (q && q.length >= 2) {
    query = query.or(
      [
        `title.ilike.%${q}%`,
        `city.ilike.%${q}%`,
        `address.ilike.%${q}%`,
        `description.ilike.%${q}%`,
      ].join(',')
    );
  }

  if (sort === 'price_asc') query = query.order('price', { ascending: true, nullsFirst: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else if (sort === 'area_desc') query = query.order('area_total', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    return { rows: [] as Row[], count: 0, page, perPage, sp, error: error.message };
  }

  const rows = (data ?? []) as Row[];
  return { rows, count: count ?? 0, page, perPage, sp, error: null as string | null };
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  // ✅ TS-safe сборка строки запроса
  const spObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') spObj[k] = v;
  }
  const search = new URLSearchParams(spObj).toString();

  const { rows, count, page, perPage, sp, error } = await getData(`?${search}`);
  const totalPages = Math.max(1, Math.ceil(count / perPage));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Объявления</h1>
        <div className="text-sm text-muted-foreground">
          Просмотр: <Link href="/listings" className="underline">Список</Link>{' · '}
          <Link href={`/listings/map${sp.toString() ? `?${sp.toString()}` : ''}`} className="underline">Карта</Link>
        </div>
      </div>

      {/* панель фильтров — как у тебя */}

      {error ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">Ошибка: {error}</div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            Найдено: <span className="font-medium">{count}</span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
              Ничего не нашлось. Попробуйте изменить фильтры.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((l) => {
                  const cover = l.cover_url ?? null;
                  return (
                    <div key={l.id} className="rounded-2xl border hover:shadow transition overflow-hidden relative">
                      <div className="absolute top-2 right-2 z-10">
                        <FavoriteButton listingId={l.id} />
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

              <Pager page={page} totalPages={totalPages} sp={sp} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Pager({ page, totalPages, sp }: { page: number; totalPages: number; sp: URLSearchParams }) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  const start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  const items: number[] = [];
  for (let i = start; i <= end; i++) items.push(i);

  return (
    <div className="flex items-center gap-2 mt-6 justify-center">
      <Link
        href={withParam(sp, { page: page > 1 ? String(page - 1) : '1' })}
        className="px-3 py-2 border rounded-md text-sm"
        aria-disabled={page <= 1}
      >
        ‹ Назад
      </Link>
      {items.map((p) => (
        <Link
          key={p}
          href={withParam(sp, { page: String(p) })}
          className={`px-3 py-2 border rounded-md text-sm ${p === page ? 'bg-black text-white border-black' : ''}`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={withParam(sp, { page: page < totalPages ? String(page + 1) : String(totalPages) })}
        className="px-3 py-2 border rounded-md text-sm"
        aria-disabled={page >= totalPages}
      >
        Вперёд ›
      </Link>
    </div>
  );
}
