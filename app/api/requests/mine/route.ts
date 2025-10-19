import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ message: 'not_authenticated' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // заявки созданные мной
  const { data: bookings, error } = await sb
    .from('bookings')
    .select('id, listing_id, status, payment_status, start_date, end_date, created_at, monthly_price, deposit')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ message: 'db_error' }, { status: 500 });

  const listingIds = Array.from(new Set((bookings ?? []).map(b => b.listing_id).filter(Boolean)));

  // подтащим заголовок/город/владельца + первую фотку
  const { data: listings } = await sb
    .from('listings')
    .select('id, title, city, owner_id, user_id')
    .in('id', listingIds);

  const { data: photos } = await sb
    .from('listing_photos')
    .select('listing_id, url, sort_order')
    .in('listing_id', listingIds);

  const coverByListing = new Map<string, string | null>();
  (listingIds || []).forEach((id) => {
    const p = (photos || [])
      .filter((ph) => ph.listing_id === id && ph.url)
      .sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
    coverByListing.set(id, p[0]?.url ?? null);
  });

  const listingById = new Map<string, any>();
  (listings || []).forEach((l) => listingById.set(l.id, l));

  const rows = (bookings || []).map((b) => {
    const l = listingById.get(b.listing_id);
    return {
      ...b,
      listing_title: l?.title ?? 'Объявление',
      listing_city: l?.city ?? null,
      cover_url: coverByListing.get(b.listing_id) ?? null,
      // для чата нам нужен владелец объявления
      owner_id_for_chat: l?.owner_id || l?.user_id || null,
    };
  });

  return NextResponse.json({ rows });
}
