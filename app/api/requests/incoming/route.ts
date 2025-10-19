// Заявки на мои (я владелец объявления)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Row = {
  id: string;
  listing_id: string;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string;
  title?: string | null;
  city?: string | null;
  cover_url?: string | null;
  renter_id?: string | null; // другая сторона для чата
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) Пробуем вьюху (если есть)
    const tryView = await sb
      .from('bookings_owner_view')
      .select(
        'id, listing_id, start_date, end_date, monthly_price, deposit, status, payment_status, created_at, title, city, cover_url, renter_id'
      )
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!tryView.error && tryView.data) {
      return NextResponse.json({ items: tryView.data as Row[] });
    }

    // 2) Фолбэк: соберём напрямую
    const myListings = await sb
      .from('listings')
      .select('id, owner_id, user_id')
      .or(`owner_id.eq.${userId},and(owner_id.is.null,user_id.eq.${userId})`);

    if (myListings.error) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    const ownedIds = (myListings.data ?? []).map(l => l.id);
    if (ownedIds.length === 0) return NextResponse.json({ items: [] });

    const qB = await sb
      .from('bookings')
      .select(
        'id, listing_id, start_date, end_date, monthly_price, deposit, status, payment_status, created_at, user_id'
      )
      .in('listing_id', ownedIds)
      .order('created_at', { ascending: false });

    if (qB.error) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    const bookings = qB.data ?? [];
    if (bookings.length === 0) return NextResponse.json({ items: [] });

    const listingIds = Array.from(new Set(bookings.map(b => b.listing_id).filter(Boolean)));

    const { data: listings } = await sb
      .from('listings')
      .select('id, title, city')
      .in('id', listingIds);

    const metaByListing = new Map<string, { title: string | null; city: string | null }>();
    (listings ?? []).forEach(l => {
      metaByListing.set(l.id, { title: l.title ?? null, city: l.city ?? null });
    });

    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order, created_at')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    const coverByListing = new Map<string, string | null>();
    (photos ?? []).forEach(p => {
      if (!coverByListing.has(p.listing_id)) {
        coverByListing.set(p.listing_id, p.url ?? null);
      }
    });

    const items: Row[] = bookings.map(b => ({
      id: b.id,
      listing_id: b.listing_id,
      start_date: b.start_date,
      end_date: b.end_date,
      monthly_price: b.monthly_price,
      deposit: b.deposit,
      status: b.status,
      payment_status: b.payment_status,
      created_at: b.created_at,
      title: metaByListing.get(b.listing_id)?.title ?? null,
      city: metaByListing.get(b.listing_id)?.city ?? null,
      cover_url: coverByListing.get(b.listing_id) ?? null,
      renter_id: b.user_id ?? null, // для чата «другая сторона»
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
