// lib/listings-search.ts
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type ListingsSearchInput = {
  q?: string | null;
  city?: string | null;
  rooms?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  with_photos?: boolean;
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'area_desc';
  page?: number;
  per_page?: number;
  // границы карты (опционально)
  bbox?: { south: number; west: number; north: number; east: number } | null;
};

export type ListingsSearchRow = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
};

export async function listingsSearch(input: ListingsSearchInput) {
  const sb = getSupabaseAdmin();

  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(24, Math.max(6, input.per_page ?? 12));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = sb
    .from('listings_with_cover')
    .select(
      'id,title,price,city,rooms,area_total,cover_url,created_at,lat,lng',
      { count: 'exact', head: false }
    )
    .eq('status', 'published');

  if (input.city) q = q.ilike('city', `%${input.city}%`);
  if (input.rooms != null) q = q.eq('rooms', input.rooms);
  if (input.price_min != null) q = q.gte('price', input.price_min);
  if (input.price_max != null) q = q.lte('price', input.price_max);
  if (input.area_min != null) q = q.gte('area_total', input.area_min);
  if (input.area_max != null) q = q.lte('area_total', input.area_max);
  if (input.with_photos) q = q.not('cover_url', 'is', null);

  // текстовый поиск по нескольким полям
  const text = (input.q ?? '').trim();
  if (text.length >= 2) {
    q = q.or(
      [
        `title.ilike.%${text}%`,
        `city.ilike.%${text}%`,
        `address.ilike.%${text}%`,
        `description.ilike.%${text}%`,
      ].join(',')
    );
  }

  // фильтр по bbox для карты
  if (input.bbox) {
    const { south, west, north, east } = input.bbox;
    // lat BETWEEN south AND north; lng BETWEEN west AND east
    q = q.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east);
  }

  // сортировки
  switch (input.sort) {
    case 'price_asc':
      q = q.order('price', { ascending: true, nullsFirst: true });
      break;
    case 'price_desc':
      q = q.order('price', { ascending: false });
      break;
    case 'area_desc':
      q = q.order('area_total', { ascending: false });
      break;
    default:
      q = q.order('created_at', { ascending: false });
  }

  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as ListingsSearchRow[],
    count: count ?? 0,
    page,
    perPage,
  };
}

// Удобный парсер querystring из URLSearchParams
export function parseSearchParams(sp: URLSearchParams): ListingsSearchInput {
  const num = (v?: string | null) => {
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bbox =
    sp.get('bbox')
      ? (() => {
          const [south, west, north, east] = (sp.get('bbox') || '')
            .split(',').map((x) => Number(x));
          if (
            [south, west, north, east].every((n) => Number.isFinite(n))
            && south < north && west < east
          ) {
            return { south, west, north, east };
          }
          return null;
        })()
      : null;

  return {
    q: sp.get('q'),
    city: sp.get('city'),
    rooms: num(sp.get('rooms')),
    price_min: num(sp.get('price_min')),
    price_max: num(sp.get('price_max')),
    area_min: num(sp.get('area_min')),
    area_max: num(sp.get('area_max')),
    with_photos: sp.get('with_photos') === '1',
    sort: (sp.get('sort') as any) || 'latest',
    page: num(sp.get('page')) ?? undefined,
    per_page: num(sp.get('per_page')) ?? undefined,
    bbox,
  };
}
