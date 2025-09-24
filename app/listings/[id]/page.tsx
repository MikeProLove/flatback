// app/listings/[id]/page.tsx
export const runtime = 'nodejs';

import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import BookWidget from './BookWidget';

type Listing = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  status: string;
  title: string | null;
  price: number | null;
  deposit: number | null;
  currency: string | null;
  city: string | null;
  address: string | null;
  rooms: number | null;
  area_total: number | null;
  description: string | null;
  created_at: string;
};

type Photo = { id: string; url: string; sort_order: number };

async function getListing(id: string) {
  const sb = getSupabaseAdmin();

  const { data: l } = await sb
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!l) return null;

  const listing = l as Listing;

  // фото из таблицы
  const { data: ph } = await sb
    .from('listing_photos')
    .select('id,url,sort_order')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true });

  let photos = (ph ?? []) as Photo[];

  // fallback из storage, если таблица пуста
  if (!photos.length) {
    const owner = listing.owner_id || listing.user_id;
    if (owner) {
      const prefix = `${owner}/${listing.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 24 });
      const items = list.data ?? [];
      photos = items.map((o, i) => {
        const pub = sb.storage.from('listings').getPublicUrl(`${prefix}/${o.name}`);
        return { id: `${i}`, url: pub.data.publicUrl, sort_order: i };
      });
    }
  }

  return { listing, photos };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const data = await getListing(params.id);
  if (!data) notFound();

  const { listing, photos } = data;

  // можно скрыть не опубликованные для посторонних, но сейчас просто показываем
  const cover = photos[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{listing.title ?? 'Объявление'}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {listing.city ?? '—'} · {listing.rooms ?? '—'}к · {listing.area_total ?? '—'} м²
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-semibold">{money(Number(listing.price) || 0)}</div>
          {typeof listing.deposit === 'number' ? (
            <div className="text-sm text-muted-foreground">Залог: {money(Number(listing.deposit))}</div>
          ) : null}
        </div>
      </div>

      {/* Галерея */}
      {photos.length ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover!} alt="" className="w-full h-72 object-cover rounded-xl md:col-span-2" />
          <div className="grid grid-cols-2 gap-3">
            {photos.slice(1, 5).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="" className="w-full h-36 object-cover rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">Фото пока нет.</div>
      )}

      {/* Описание + виджет бронирования */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm whitespace-pre-wrap">
              {listing.description || 'Описание не заполнено.'}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Адрес: {listing.address || '—'}
            </div>
          </div>
        </div>

        <div>
          {/* Виджет бронирования */}
          <div className="mt-0">
            <BookWidget
              listingId={listing.id}
              price={Number(listing.price) || 0}
              deposit={typeof listing.deposit === 'number' ? listing.deposit : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
