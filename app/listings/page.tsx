import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  created_at: string;
  status: string;
};

async function getData() {
  const sb = getSupabaseAdmin();

  const { data: listings } = await sb
    .from('listings')
    .select('id,owner_id,user_id,title,price,city,rooms,area_total,created_at,status')
    .order('created_at', { ascending: false })
    .limit(24);

  const cover = new Map<string, string>();

  if (listings?.length) {
    const ids = listings.map(l => l.id);
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing_id', ids)
      .order('sort_order', { ascending: true });

    for (const p of (photos ?? []) as Array<{ listing_id: string; url: string }>) {
      if (!cover.has(p.listing_id)) cover.set(p.listing_id, p.url);
    }

    // fallback по Storage для тех, у кого обложки нет
    for (const l of listings as Listing[]) {
      if (!cover.has(l.id)) {
        const owner = l.owner_id || l.user_id;
        if (!owner) continue;
        const prefix = `${owner}/${l.id}`;
        const list = await sb.storage.from('listings').list(prefix, { limit: 1 });
        if (!list.error && list.data?.[0]) {
          const fullPath = `${prefix}/${list.data[0].name}`;
          const pub = sb.storage.from('listings').getPublicUrl(fullPath);
          cover.set(l.id, pub.data.publicUrl);
        }
      }
    }
  }

  return { listings: (listings ?? []) as Listing[], cover };
}

export default async function ListingsPage() {
  const { listings, cover } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Объявления</h1>

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет объявлений. <a href="/listings/create" className="underline">Создайте первое</a>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <a key={l.id} href={`/listings/${l.id}`} className="rounded-2xl border hover:shadow transition overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                {cover.get(l.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.get(l.id)!} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-4 space-y-1">
                <div className="text-lg font-semibold">{l.title ?? 'Объявление'}</div>
                <div className="text-sm text-muted-foreground">
                  {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                </div>
                <div className="text-base font-semibold">{money(Number(l.price) || 0)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
