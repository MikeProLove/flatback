// app/listings/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
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

type Photo = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
};

async function getListing(id: string) {
  const sb = getSupabaseServer();

  const { data: listing, error } = await sb
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !listing) return null;

  const { data: photos } = await sb
    .from('listing_photos')
    .select('id,listing_id,url,sort_order')
    .eq('listing_id', id)
    .order('sort_order', { ascending: true });

  return { listing: listing as Listing, photos: (photos as Photo[]) ?? [] };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const data = await getListing(params.id);
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

      {/* фотогалерея */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="w-full h-48 object-cover rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
          Фотографии не загружены.
        </div>
      )}

      {/* параметры */}
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
      {listing.tour_url || listing.tour_file_path ? (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="font-medium">3D-тур</div>
          {listing.tour_url ? (
            <a href={listing.tour_url} target="_blank" className="underline">Открыть ссылку тура</a>
          ) : null}
          {listing.tour_file_path ? (
            <div className="text-sm">
              Файл: <span className="text-muted-foreground">{listing.tour_file_path}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Описание */}
      {listing.description ? (
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-1">Описание</div>
          <div className="whitespace-pre-line text-sm">{listing.description}</div>
        </div>
      ) : null}
    </div>
  );
}
