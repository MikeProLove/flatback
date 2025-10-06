// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import PublishButtons from '../_components/PublishButtons';

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

export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const sb = getSupabaseAdmin();

  // 1) основное объявление
  const { data: listing, error: lErr } = await sb
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
    .maybeSingle();

  if (lErr || !listing) notFound();

  // 2) фото
  const { data: photos } = await sb
    .from('listing_photos')
    .select('url, sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  // 3) показывать ли кнопки публикации
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
          <PublishButtons id={listing.id} status={listing.status} />
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
