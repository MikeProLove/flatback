// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import FavoriteToggle from './ui/FavoriteToggle';
import BookWidget from './ui/BookWidget';
import Amenities from './ui/Amenities';
import PhotoLightbox from './ui/PhotoLightbox';

// ✅ новая универсальная кнопка открытия чата
import OpenChatButton from '@/app/(components)/OpenChatButton';

type ListingRow = {
  id: string;
  owner_id: string | null;
  user_id: string | null;

  status: 'draft' | 'published';
  title: string | null;
  description: string | null;

  price: number | null;
  deposit: number | null;
  currency: 'RUB' | 'USD' | 'EUR' | null;

  city: string | null;
  address: string | null;
  rooms: number | null;
  area_total: number | null;
  floor: number | null;
  floors_total: number | null;

  lat: number | null;
  lng: number | null;

  building_type: string | null;
  renovation: string | null;
  furniture: string | null;
  appliances: string | null;
  balcony: string | null;
  bathroom: string | null;
  ceiling_height: number | null;
  parking: string | null;
  internet: string | null;
  concierge: string | null;
  security: string | null;
  lift: string | null;
  utilities_included: boolean | null;
  pets_allowed: boolean | null;
  kids_allowed: boolean | null;
  metro: string | null;
  metro_distance_min: number | null;

  created_at: string;
};

type PhotoRow = {
  id: string;
  url: string | null;
  storage_path: string | null;
  sort_order: number | null;
};

function money(n?: number | null, cur: string = 'RUB') {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur as any,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} ₽`;
  }
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  const sb = getSupabaseAdmin();

  // 1) Объявление
  const { data: listing, error } = await sb
    .from('listings')
    .select(
      [
        'id',
        'owner_id',
        'user_id',
        'status',
        'title',
        'description',
        'price',
        'deposit',
        'currency',
        'city',
        'address',
        'rooms',
        'area_total',
        'floor',
        'floors_total',
        'lat',
        'lng',
        'building_type',
        'renovation',
        'furniture',
        'appliances',
        'balcony',
        'bathroom',
        'ceiling_height',
        'parking',
        'internet',
        'concierge',
        'security',
        'lift',
        'utilities_included',
        'pets_allowed',
        'kids_allowed',
        'metro',
        'metro_distance_min',
        'created_at',
      ].join(',')
    )
    .eq('id', params.id)
    .single<ListingRow>();

  if (error || !listing) notFound();

  // 2) Фото
  const { data: photosRaw } = await sb
    .from('listing_photos')
    .select('id,url,storage_path,sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  const photos = (photosRaw ?? []) as PhotoRow[];
  const images: string[] = photos.map((p) => p.url).filter((u): u is string => !!u);

  // 3) Избранное пользователя
  let isFavorite = false;
  if (userId) {
    const fav = await sb
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_id', params.id)
      .maybeSingle();
    isFavorite = !!fav.data;
  }

  // 4) Является ли текущий пользователь владельцем
  const isOwner =
    !!userId && (listing.owner_id === userId || (!listing.owner_id && listing.user_id === userId));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Заголовок + действия */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{listing.title ?? 'Объявление'}</h1>
          <div className="text-sm text-muted-foreground">
            {listing.city ?? '—'}, {listing.address ?? '—'}
          </div>
        </div>

        {/* Избранное — только для вошедших */}
        {userId ? <FavoriteToggle listingId={listing.id} initial={isFavorite} /> : null}
      </div>

      {/* Галерея */}
      {images.length > 0 ? (
        <PhotoLightbox images={images} thumbClass="rounded-xl overflow-hidden" />
      ) : (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Фото ещё не загружены.
        </div>
      )}

      {/* Контент */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] gap-6">
        {/* Левая колонка */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-4 space-y-2">
            <div className="text-xl font-semibold">
              {money(listing.price, listing.currency ?? 'RUB')}
              {typeof listing.deposit === 'number' ? (
                <span className="text-sm text-muted-foreground ml-2">
                  · залог {money(listing.deposit, listing.currency ?? 'RUB')}
                </span>
              ) : null}
            </div>
            <div className="text-sm">
              Комнат: <b>{listing.rooms ?? '—'}</b> · Площадь: <b>{listing.area_total ?? '—'} м²</b>{' '}
              · Этаж: <b>{listing.floor ?? '—'}</b> из <b>{listing.floors_total ?? '—'}</b>
            </div>
          </div>

          {listing.description ? (
            <div className="rounded-2xl border p-4 whitespace-pre-wrap">{listing.description}</div>
          ) : null}

          {/* Удобства */}
          <Amenities listing={listing} />
        </div>

        {/* Правая колонка */}
        <div className="space-y-4">
          {/* Кнопка чата — показываем только не владельцу и только залогиненным */}
          {!isOwner && userId ? (
            <div className="rounded-2xl border p-4">
              <OpenChatButton
                listingId={listing.id}
                otherId={listing.owner_id || listing.user_id || undefined}
                label="Открыть чат с владельцем"
              />
            </div>
          ) : null}

          {/* Бронирование */}
          <div className="rounded-2xl border p-4">
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
