// app/listings/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import EditFormClient from './EditFormClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ListingRow = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  status: string;
  title: string | null;
  price: number | null;
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
  metro: string | null;
  metro_distance_min: number | null;
  deposit: number | null;
  utilities_included: boolean | null;
  pets_allowed: boolean | null;
  kids_allowed: boolean | null;
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
  tour_url: string | null;
};

type PhotoRow = { id: string; url: string; storage_path: string | null; sort_order: number | null };

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) notFound();

  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from('listings')
    .select(
      [
        'id','owner_id','user_id','status','title','price','city','address','description',
        'rooms','area_total','area_living','area_kitchen','floor','floors_total',
        'lat','lng','metro','metro_distance_min','deposit',
        'utilities_included','pets_allowed','kids_allowed',
        'building_type','renovation','furniture','appliances','balcony','bathroom',
        'ceiling_height','parking','internet','concierge','security','lift','tour_url',
      ].join(',')
    )
    .eq('id', params.id)
    .maybeSingle<ListingRow>();

  if (error || !data) notFound();
  const owner = data.owner_id || data.user_id;
  if (owner !== userId) notFound();

  const { data: photos } = await sb
    .from('listing_photos')
    .select('id,url,storage_path,sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Редактировать объявление</h1>
      <EditFormClient initial={data} initialPhotos={(photos ?? []) as PhotoRow[]} />
    </div>
  );
}
