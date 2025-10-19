import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ message: 'not_authenticated' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // какие объявления мои
  const { data: myListings } = await sb
    .from('listings')
    .select('id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`);

  const ids = (myListings ?? []).map((l) => l.id);
  if (!ids.length) return NextResponse.json({ rows: [] });

  // заявки на мои объявления
  const { data: bookings, error } = await sb
    .from('bookings')
    .select('id, listing_id, user_id, status, payment_status, start_date, end_date, created_at, monthly_price, deposit')
    .in('listing_id', ids)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ message: 'db_error' }, { status: 500 });

  // инфо по листингам + фото
  const { data: photos } = await sb
    .from('listing_photos')
    .select('listing_id, url, sort_order')
    .in('listing_id', ids);

  const { data: listings } = await sb
    .from('listings')
    .select('id, title, city')
    .in('id', ids);

  const listingById = new Map<string, any>();
  (listings || []).forEach((l) => listingById.set(l.id, l));

  const coverByListing = new Map<string, string | null>();
  (ids || []).forEach((id) => {
    const p = (photos || [])
      .filter((ph) => ph.listing_id === id && ph.url)
      .sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
    coverByListing.set(id, p[0]?.url ?? null);
  });

  const rows = (bookings || []).map((b) => {
    const l = listingById.get(b.listing_id);
    return {
      ...b,
      listing_title: l?.title ?? 'Объявление',
      listing_city: l?.city ?? null,
      cover_url: coverByListing.get(b.listing_id) ?? null,
      // для чата нам нужен заявитель
      renter_id_for_chat: b.user_id ?? null,
    };
  });

  return NextResponse.json({ rows });
}
