import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import EditListingForm from './EditListingForm';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) redirect('/');

  const sb = getSupabaseAdmin();
  const { data: listing } = await sb.from('listings').select('*').eq('id', params.id).maybeSingle();
  if (!listing) notFound();

  const owner = listing.owner_id || listing.user_id;
  if (owner !== userId) redirect(`/listings/${params.id}`);

  const { data: photos } = await sb
    .from('listing_photos')
    .select('id,url,sort_order')
    .eq('listing_id', params.id)
    .order('sort_order', { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Редактировать объявление</h1>
      <EditListingForm listing={listing} photos={photos ?? []} />
    </div>
  );
}
