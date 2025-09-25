// app/favorites/page.tsx
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import FavoriteButton from '@/app/listings/FavoriteButton';

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  created_at: string;
};

export default async function FavoritesPage() {
  const { userId } = auth();
  if (!userId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Избранное</h1>
        <div className="rounded-2xl border p-6 text-sm">
          Пожалуйста, войдите, чтобы видеть список избранного.
        </div>
      </div>
    );
  }

  const sb = getSupabaseAdmin();

  // 1) список избранных id
  const { data: favs, error: favErr } = await sb
    .from('favorites')
    .select('listing_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (favErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Избранное</h1>
        <div className="rounded-2xl border p-6 text-sm text-red-600">
          Ошибка чтения избранного: {favErr.message}
        </div>
      </div>
    );
  }

  const ids = (favs ?? []).map(f => f.listing_id);
  let rows: ListingRow[] = [];

  if (ids.length) {
    // 2) пробуем вьюху с обложкой
    const viaView = await sb
      .from('listings_with_cover')
      .select('id,title,price,city,rooms,area_total,cover_url,created_at')
      .in('id', ids);

    if (!viaView.error) {
      rows = (viaView.data ?? []) as ListingRow[];
    } else {
      // 3) фоллбек: listings + первая фотка
      const { data: ls } = await sb
        .from('listings')
        .select('id,title,price,city,rooms,area_total,created_at')
        .in('id', ids);

      const map = new Map<string, ListingRow>();
      (ls ?? []).forEach(r => map.set(r.id, { ...r, cover_url: null } as ListingRow));

      const { data: ph } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order,created_at')
        .in('listing_id', ids)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      for (const p of ph ?? []) {
        const row = map.get(p.listing_id);
        if (row && !row.cover_url) row.cover_url = p.url as any;
      }
      rows = Array.from(map.values());
    }

    // сохранить порядок как в favorites
    const order = new Map<string, number>();
    ids.forEach((id, i) => order.set(String(id), i));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Избранное</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Список пуст. Откройте <a href="/listings" className="underline">объявления</a> и добавьте некоторые в избранное.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((l) => (
            <div key={l.id} className="rounded-2xl border hover:shadow transition overflow-hidden relative">
              <div className="absolute top-2 right-2 z-10">
                <FavoriteButton listingId={l.id} initial={true} />
              </div>
              <a href={`/listings/${l.id}`}>
                <div className="aspect-[4/3] bg-muted">
                  {l.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
          ))}
        </div>
      )}
    </div>
  );
}
