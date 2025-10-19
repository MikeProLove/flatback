// app/api/requests/mine/route.ts
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
  renter_id: string | null; // это вы
  owner_id: string | null;  // владелец объявления (для чата)
};

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) тянем «мои» заявки из устойчивой вьюхи
  const { data: bookings, error } = await sb
    .from('v_requests_mine')
    .select('*')
    .eq('renter_id', userId)
    .order('created_at', { ascending: false })
    .returns<Row[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = bookings ?? [];

  // 2) подтянем карточку объявления (название/город)
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
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });
    (photos ?? []).forEach(p => {
      if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url ?? '');
    });
  }

  // 4) ответ
  return NextResponse.json({
    rows: rows.map(r => ({
      id: r.id,
      status: r.status,
      payment_status: r.payment_status,
      start_date: r.start_date,
      end_date: r.end_date,
      monthly_price: r.monthly_price,
      deposit: r.deposit,
      created_at: r.created_at,
      listing_id: r.listing_id,
      listing_title: r.listing_id ? meta.get(r.listing_id)?.title ?? null : null,
      listing_city: r.listing_id ? meta.get(r.listing_id)?.city ?? null : null,
      cover_url: r.listing_id ? covers.get(r.listing_id) ?? null : null,
      // для кнопки чата
      owner_id_for_chat: r.owner_id,
      chat_id: null, // если у вас есть связь — подставьте, иначе пусть кнопка открывает/находит чат
    })),
  });
}
