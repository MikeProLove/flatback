// app/listings/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';
import GalleryLightbox from './GalleryLightbox';
import Actions from '../my/Actions'; // ← используем те же кнопки, что в "Мои объявления"

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
  owner_id: string | null;
  user_id: string | null; // на случай старых записей
  status: string | null;
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

type PhotoRow = { id: string; listing_id: string; url: string; sort_order: number };

async function fetchListingAndPhotos(id: string) {
  const sb = getSupabaseAdmin();

  const { data: l, error: e1 } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
  if (e1 || !l) return null;
  const listing = l as Listing;

  // сначала пробуем фото из таблицы
  const { data: photoRows } = await sb
    .from('listing_photos')
    .select('id,listing_id,url,sort_order')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true });

  let photos: { id: string; url: string }[] =
    (photoRows ?? []).map((p: any) => ({ id: (p as PhotoRow).id, url: (p as PhotoRow).url }));

  // fallback: если строк нет — подхватываем первый десяток файлов из Storage
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

  const { userId } = auth();
  const { listing, photos } = data;

  const owner = listing.owner_id || listing.user_id;
  const isOwner = !!userId && !!owner && userId === owner;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {/* Заголовок + цена + действия владельца */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{listing.title ?? 'Объявление'}</h1>
          <div className="text-sm text-muted-foreground">
            {listing.address || listing.city || 'Адрес не указан'}
          </div>
          {isOwner && (
            <div className="mt-3">
              <Actions id={listing.id} status={listing.status ?? 'draft'} />
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-muted-foreground">Аренда</div>
          <div className="text-2xl font-semibold">{money(Number(listing.price) || 0)}</div>
          <div className="text-xs mt-1">
            Статус:{' '}
            <span className={listing.status === 'published' ? 'text-green-600' : 'text-yellow-600'}>
              {listing.status ?? 'draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Фото — с полноэкранным просмотром */}
      {photos.length > 0 ? (
        <GalleryLightbox photos={photos} />
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
          Фотографии не загружены.
        </div>
      )}

      {/* Характеристики */}
      <div className="rounded-2xl border p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {listing.rooms != null && <div><b>Комнат:</b> {listing.rooms}</div>}
        {listing.area_total && <div><b>Площадь общая:</b> {listing.area_total} м²</div>}
        {listing.area_kitchen && <div><b>Кухня:</b> {listing.area_kitchen} м²</div>}
        {listing.area_living && <div><b>Жилая:</b> {listing.area_living} м²</div>}
        {listing.floor != null && <div><b>Этаж:</b> {listing.floor}{listing.floors_total ? ` из ${listing.floors_total}` : ''}</div>}
        {listing.metro && <div><b>Метро:</b> {listing.metro}{listing.metro_distance_min ? `, ${listing.metro_distance_min} мин.` : ''}</div>}
        {listing.building_type && <div><b>Тип дома:</b> {listing.building_type}</div>}
        {listing.renovation && <div><b>Ремонт:</b> {listing.renovation}</div>}
        {listing.furniture && <div><b>Мебель:</b> {listing.furniture}</div>}
        {listing.bathroom && <div><b>Санузел:</b> {listing.bathroom}</div>}
        {listing.ceiling_height && <div><b>Потолки:</b> {listing.ceiling_height} м</div>}
        {listing.parking && <div><b>Парковка:</b> {listing.parking}</div>}
        <div><b>Интернет:</b> {listing.internet ? 'есть' : '—'}</div>
        <div><b>Лифт:</b> {listing.lift ? 'есть' : '—'}</div>
        <div><b>Балкон:</b> {listing.balcony ? 'есть' : '—'}</div>
      </div>

      {/* 3D-тур */}
      {(listing.tour_url || listing.tour_file_path) && (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="font-medium">3D-тур</div>
          {listing.tour_url && (
            <a href={listing.tour_url} target="_blank" className="underline">Открыть ссылку тура</a>
          )}
          {listing.tour_file_path && (
            <div className="text-sm text-muted-foreground">Файл: {listing.tour_file_path}</div>
          )}
        </div>
      )}

      {/* Описание */}
      {listing.description && (
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-1">Описание</div>
          <div className="whitespace-pre-line text-sm">{listing.description}</div>
        </div>
      )}
    </div>
  );
}
