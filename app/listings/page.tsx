export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import SearchBar from './SearchBar';

type Row = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url?: string | null;
  created_at: string;
  status: string;
};

function money(n: number | null | undefined) {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
  } catch { return `${Math.round(v)} ₽`; }
}
const toInt = (v?: string, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function keep(sp: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)) as Record<string, string>
  ).toString();
}

async function getData(sp: Record<string, string | undefined>) {
  const sb = getSupabaseAdmin();

  const page = Math.max(1, toInt(sp.page, 1));
  const perPage = Math.min(50, Math.max(1, toInt(sp.per_page, 24)));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status', { count: 'exact' })
    .eq('status', 'published');

  const qStr = (sp.q || '').trim();
  if (qStr) {
    const safe = qStr.replace(/%/g, '');
    q = q.or(`title.ilike.%${safe}%,city.ilike.%${safe}%,address.ilike.%${safe}%`);
  }

  if (sp.city) q = q.ilike('city', sp.city);
  if (sp.rooms) q = q.eq('rooms', toInt(sp.rooms));
  if (sp.price_min) q = q.gte('price', toInt(sp.price_min));
  if (sp.price_max) q = q.lte('price', toInt(sp.price_max));
  if (sp.area_min) q = q.gte('area_total', toInt(sp.area_min));
  if (sp.area_max) q = q.lte('area_total', toInt(sp.area_max));
  if (sp.with_photo === 'on') q = q.not('cover_url', 'is', null);

  const sort = sp.sort || 'latest';
  if (sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: true });
  else if (sort === 'area_desc') q = q.order('area_total', { ascending: false, nullsFirst: true });
  else q = q.order('created_at', { ascending: false });

  q = q.range(from, to);

  const { data, error, count } = await q;

  let rows = (data ?? []) as Row[];
  let covers = new Map<string, string>();

  // Фоллбэк: если у части объявлений cover_url пуст — тянем первое фото из listing_photos
  const missingIds = rows.filter(r => !r.cover_url).map(r => r.id);
  if (missingIds.length) {
    const { data: ph } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing_id', missingIds)
      .order('sort_order', { ascending: true });
    if (ph) {
      for (const p of ph as { listing_id: string; url: string; sort_order: number }[]) {
        if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url);
      }
    }
  }

  return {
    rows,
    covers,           // карта listing_id -> url обложки
    count: count ?? 0,
    page,
    perPage,
    sp,
    error: error?.message ?? null,
  };
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const { rows, covers, count, page, perPage, sp } = await getData(searchParams);
  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const qsBase = keep(sp);

  const pageHref = (p: number) => {
    const u = new URLSearchParams(qsBase);
    u.set('page', String(p));
    u.set('per_page', String(perPage));
    return `/listings?${u.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Объявления</h1>

      <SearchBar sp={sp} />

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">Найдено: <b>{count}</b></div>
        <div className="flex items-center gap-2">
          {page > 1 && <a href={pageHref(page - 1)} className="px-2 py-1 border rounded">Назад</a>}
          <div className="px-2">Стр. {page} из {totalPages}</div>
          {page < totalPages && <a href={pageHref(page + 1)} className="px-2 py-1 border rounded">Вперёд</a>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Ничего не найдено.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((l) => {
            const cover = (l as any).cover_url ?? covers.get(l.id) ?? null;
            return (
              <a key={l.id} href={`/listings/${l.id}`} className="rounded-2xl border hover:shadow transition overflow-hidden">
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
                  <div className="text-base font-semibold">{money(l.price)}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
