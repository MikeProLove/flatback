// app/api/requests/incoming/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Row = {
  id: string;
  status: string | null;
  payment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;
  renter_id: string | null; // заявитель (для чата)
  owner_id: string | null;  // это вы
};

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) заявки на мои объявления
  const { data: bookings, error } = await sb
    .from('v_requests_incoming')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Row[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = bookings ?? [];

  // 2) карточки объявлений
  const listingIds = [...new Set(rows.map(r => r.listing_id).filter(Boolean))] as string[];
  let meta = new Map<string, { title: string | null; city: string | null }>();
  if (listingIds.length) {
    const { data: listings } = await sb
      .from('listings')
      .select('id,title,city')
      .in('id', listingIds);
    (listings ?? []).forEach(l => meta.set(l.id, { title: l.title ?? null, city: l.city ?? null }));
  }

  // 3) обложки
  let covers = new Map<string, string>();
  if (listingIds.length) {
    const { data: photos } = await sb
      .from('listing_photos')
      .select('listing_id,url,sort_order')
      .in('listing
