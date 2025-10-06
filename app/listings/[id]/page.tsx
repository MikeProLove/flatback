// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import PublishButtons from '../_components/PublishButtons';

type ListingRow = {
  id: string;
  title: string | null;
  status: 'draft' | 'published' | string | null;
  price: number | null;
  currency: string | null;
  deposit: number | null;
  city: string | null;
  address: string | null;
  description: string | null;
  rooms: number | null;
  area_total: number | null;
  area_living: number | null;
  area_kitchen: number | null;
  floor: number | null;
  floors_total: number | null;
  lat: number | null;
  lng: number | null;
  owner_id: string | null;
  user_id: string | null;
  created_at: string;
};

function money(n?: number | null) {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} ₽`;
  }
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const sb = getSupabaseAdmin();

 // 1) получаем объявление строго одного типа
  const { data: listing, error } = await sb
    .from('listings')
    .select(
      [
        'id',
        'title',
        'status',
        'price',
        'currency',
        'deposit',
        'city',
        'address',
        'description',
        'rooms',
        'area_total',
        'area_living',
        'area_kitchen',
        'floor',
        'floors_total',
        'lat',
        'lng',
        'owner_id',
        'user_id',
        'created_at',
      ].join(',')
    )
    .eq('id', params.id)
    .single<ListingRow>(); // <-- ключевая разница
  
  if (error || !listing) notFound();
  const listing = resp.data as ListingRow;

  // 2) фото
  const { data: photos } = await sb
    .from('listing_photos')
    .select('url, sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  // 3) проверка владельца для кнопок публикации
  const { userId } = auth();
  const isOwner =
    !!userId &&
    (listing.owner_id === userId ||
      (!listing.owner_id && listing.user_id === userId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {listing.title ?? 'Объявление'}
          </h1>
          <div className="text-sm text-muted-foreground">
            {listing.city ?? '—'} {listing.address ? `· ${listing.address}` : ''}
          </div>
          <div className="text-xs">
            Статус:{' '}
            <span
              className={
                listing.status === 'published'
                  ? 'text-green-600'
                  : 'text-yellow-700'
              }
            >
              {listing.status}
            </span>
          </div>
        </div>

        {isOwner ? (
          <PublishButtons id={listing.id} status={listing.status ?? undefined} />
        ) : null}
      </div>

      {/* фото */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {photos?.length ? (
          photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${p.url}-${i}`}
              src={p.url}
              alt=""
              className="w-full h-64 rounded-2xl object-cover border"
            />
          ))
        ) : (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            Фото не загружены.
          </div>
        )}
      </div>

      {/* краткие характеристики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-base font-semibold">{money(listing.price)}</div>
          {listing.deposit ? (
            <div className="text-sm text-muted-foreground">
              Залог: {money(listing.deposit)}
            </div>
          ) : null}
          <div className="text-sm">
            {listing.rooms ?? '—'}к · {listing.area_total ?? '—'} м²
            {listing.floor ? ` · ${listing.floor}` : ''}{' '}
            {listing.floors_total ? `/${listing.floors_total} эт.` : ''}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm whitespace-pre-wrap">
            {listing.description || 'Описание не заполнено.'}
          </div>
        </div>
      </div>
    </div>
  );
}
