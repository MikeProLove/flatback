export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import FavoriteButton from '../listings/FavoriteButton';

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  owner_id: string | null;
  user_id: string | null;
};

export default async function FavoritesPage() {
  const { userId } = auth();
  if (!userId) redirect('/');

  const sb = getSupabaseAdmin();

  // 1) ids избранного
  const { data: favs } = await sb
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const ids = (favs ?? []).map((r: any) => r.listing_id);
  let listings: ListingRow[] = [];
  const fallback = new Map<string, string>();

  if (ids.length) {
    // 2) сами объявления из вьюхи
    const { data } = await sb
      .from('listings_with_cover')
      .select('id,title,price,city,rooms,area_total,cover_url,owner_id,user_id')
      .in('id', ids);

    listings = (data ?? []) as ListingRow[];

    // 3) fallback на случай отсутствия cover_url
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
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Избранное</h1>

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          В избранном пусто. Перейдите в <a href="/listings" className="underline">объявления</a> и нажмите на сердечко.
        </div>
      ) : (
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
      )}
    </div>
  );
}
