// app/listings/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import GalleryLightbox from './GalleryLightbox';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  metro: string | null;
  metro_distance_min: number | null;
  rooms: number | null;
  area_total: number | null;
  area_living: number | null;
  area_kitchen: number | null;
  floor: number | null;
  floors_total: number | null;
  building_type: string | null;
  renovation: string | null;
  furniture: string | null;
  bathroom: string | null;
  ceiling_height: number | null;
  parking: string | null;
  internet: boolean | null;
  lift: boolean | null;
  balcony: boolean | null;
  description: string | null;
  price: number | null;
  tour_url: string | null;
  tour_file_path: string | null;
  created_at: string;
};

async function fetchListingAndPhotos(id: string) {
  const sb = getSupabaseAdmin();

  const { data: l } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
  if (!l) return null;
  const listing = l as Listing;

  // Сначала пробуем фото из таблицы
  const { data: photoRows } = await sb
    .from('listing_photos')
    .select('id,listing_id,url,sort_order')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true });

  let photos: { id: string; url: string }[] =
    (photoRows ?? []).map((p: any) => ({ id: p.id, url: p.url }));

  // Fallback: если нет строк — заглянем прямо в Storage
  if (photos.length === 0) {
    const owner = listing.owner_id || listing.user_id;
    if (owner) {
      const prefix = `${owner}/${listing.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 100 });
      if (!list.error && list.data?.length) {
        photos = list.data.map((obj) => {
          const fullPath = `${prefix}/${obj.name}`;
          const pub = sb.storage.from('listings').getPublicUrl(fullPath);
          return { id: fullPath, url: pub.data.publicUrl };
        });
      }
    }
  }

  return { listing, photos };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const data = await fetchListingAndPhotos(params.id);
  if (!data) notFound();
  const { listing, photos } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{listing.title ?? 'Объявление'}</h1>
          <div className="text-sm text-muted-foreground">
            {listing.address || listing.city || 'Адрес не указан'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Аренда</div>
          <div className="text-2xl font-semibold">{money(Number(listing.price) || 0)}</div>
        </div>
      </div>

      {/* фотогалерея с полноэкранным просмотром */}
      {photos.length > 0 ? (
        <GalleryLightbox photos={photos} />
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
          Фотографии не загружены.
        </div>
      )}

      {/* ...остальные секции вашей страницы остаются без изменений... */}
    </div>
  );
}
