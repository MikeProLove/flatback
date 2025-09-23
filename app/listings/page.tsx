import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

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

async function getData() {
  const sb = getSupabaseAdmin();

  // 1) берём объявления и cover_url из вьюхи
    const { data, error } = await sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id')
    .eq('status', 'published')              // ← только опубликованные
    .order('created_at', { ascending: false })
    .limit(24);

  const listings = (data ?? []) as ListingRow[];

  // 2) Fallback из Storage для карточек без cover_url
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

  return { listings, fallback };
}

export default async function ListingsPage() {
  const { listings, fallback } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Объявления</h1>

      {listings.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет объявлений. <a href="/listings/create" className="underline">Создайте первое</a>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const cover = l.cover_url || fallback.get(l.id);
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
