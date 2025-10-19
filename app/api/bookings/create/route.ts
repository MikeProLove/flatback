// app/api/bookings/create/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  listingId?: string;
  startDate?: string | null;
  endDate?: string | null;
};

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const listingId = body.listingId?.trim();
  if (!listingId) {
    return NextResponse.json({ error: 'bad_request', message: 'listingId обязателен' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Подтянем объявление (цена/залог — серверный источник истины)
  const { data: L } = await sb
    .from('listings')
    .select('id, owner_id, user_id, price, deposit')
    .eq('id', listingId)
    .maybeSingle();

  if (!L) return NextResponse.json({ error: 'not_found', message: 'listing_not_found' }, { status: 404 });

  const ownerId = L.owner_id || L.user_id || null;
  if (ownerId === userId) {
    return NextResponse.json({ error: 'forbidden', message: 'self_booking_forbidden' }, { status: 403 });
  }

  // Вставка заявки — только нужные поля
  const toInsert: Record<string, any> = {
    listing_id: listingId,
    renter_id: userId,                 // <— вот ключевая связь
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    monthly_price: L.price ?? null,
    deposit: L.deposit ?? null,
    status: 'pending',
    payment_status: 'pending',
  };

  // Если вдруг в схеме нет какого-то поля — удалим и повторим вставку (тихо и безопасно)
  async function tryInsert(obj: Record<string, any>): Promise<{ id?: string; err?: string }> {
    const r = await sb.from('bookings').insert(obj).select('id').single();
    if (!r.error) return { id: r.data?.id };

    if (r.error.code === '42703') {
      const m = String(r.error.message).match(/column\s+"?(\w+)"?\s+of/i);
      if (m?.[1] && m[1] in obj) { delete obj[m[1]]; return tryInsert(obj); }
    }
    return { err: r.error.message };
  }

  const ins = await tryInsert(toInsert);
  if (ins.err) return NextResponse.json({ error: 'db_error', message: ins.err }, { status: 500 });

  return NextResponse.json({ id: ins.id });
}
