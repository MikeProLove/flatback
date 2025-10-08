// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import PublishButtons from '../_components/PublishButtons';
import PhotoGallery from './PhotoGallery';

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

type PhotoRow = {
  id?: string;
  url: string;
  storage_path?: string | null;
  sort_order: number | null;
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

  // 1) объявление
  const { data: listing, error } = await sb
    .from('listings')
    .select(
      [
        'id','title','status','price','currency','deposit','city','address','description',
        'rooms','area_total','area_living','area_kitchen','floor','floors_total',
        'lat','lng','owner_id','user_id','created_at',
      ].join(',')
    )
    .eq('id', params.id)
    .single<ListingRow>();

  if (error || !listing) notFound();

  // 2) фото из таблицы
  const photosTyped: PhotoRow[] =
    ((await sb
      .from('listing_photos')
      .select('id, url, storage_path, sort_order')
      .eq('listing_id', params.id)
      .order('sort_order', { ascending: true })).data ?? []) as PhotoRow[];

  // 3) fallback: если в таблице нет записей, берём 1–6 файлов из storage
  let photos: PhotoRow[] = photosTyped;
  if (!photosTyped.length) {
    const owner = listing.owner_id || listing.user_id;
    if (owner) {
      const prefix = `${owner}/${listing.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 6 });
      const fromStorage =
        (list?.data ?? []).map((f, i) => {
          const path = `${prefix}/${f.name}`;
          const pub = sb.storage.from('listings').getPublicUrl(path);
          return {
            url: pub.data.publicUrl,
            storage_path: path,
            sort_order: i,
          } as PhotoRow;
        }) ?? [];
      photos = fromStorage;
    }
  }

  // 4) владелец?
  const { userId } = auth();
  const isOwner =
    !!userId &&
    (listing.owner_id === userId || (!listing.owner_id && listing.user_id === userId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{listing.title ?? 'Объявление'}</h1>
          <div className="text-sm text-muted-foreground">
            {listing.city ?? '—'} {listing.address ? `· ${listing.address}` : ''}
          </div>
          <div className="text-xs">
            Статус:{' '}
            <span className={listing.status === 'published' ? 'text-green-600' : 'text-yellow-700'}>
              {listing.status}
            </span>
          </div>
        </div>

        {isOwner ? <PublishButtons id={listing.id} status={listing.status ?? undefined} /> : null}
      </div>

      {/* Галерея фото с полноэкранным просмотром */}
      <PhotoGallery images={photos.map((p) => ({ url: p.url }))} />

      {/* Характеристики + описание */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-base font-semibold">{money(listing.price)}</div>
          {listing.deposit ? (
            <div className="text-sm text-muted-foreground">Залог: {money(listing.deposit)}</div>
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
