// app/api/bookings/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Тело запроса
type CreateBookingBody = {
  listingId: string;             // UUID объявления (строкой)
  start_date?: string | null;    // 'YYYY-MM-DD'
  end_date?: string | null;      // 'YYYY-MM-DD'
  monthly_price?: number | null; // если не указано — возьмём из listing.price
  deposit?: number | null;       // если не указано — возьмём из listing.deposit
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = (await req.json().catch(() => ({}))) as CreateBookingBody;
    const listingId = String(body?.listingId || '').trim();

    if (!listingId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId required' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // 1) Тянем объявление (и владельца), чтобы заполнить owner_id и дефолтные цены
    const { data: L, error: Lerr } = await sb
      .from('listings')
      .select('id, owner_id, user_id, price, deposit, status')
      .eq('id', listingId)
      .maybeSingle();

    if (Lerr) {
      return NextResponse.json({ error: 'db_error', message: Lerr.message }, { status: 500 });
    }
    if (!L) {
      return NextResponse.json({ error: 'not_found', message: 'Listing not found' }, { status: 404 });
    }
    if (L.status !== 'published') {
      return NextResponse.json({ error: 'not_published', message: 'Listing is not published' }, { status: 400 });
    }

    const ownerId: string | null = L.owner_id || L.user_id || null;
    if (!ownerId) {
      return NextResponse.json({ error: 'no_owner', message: 'Listing owner missing' }, { status: 400 });
    }
    if (ownerId === userId) {
      return NextResponse.json({ error: 'self_booking', message: 'Owner cannot book own listing' }, { status: 400 });
    }

    // 2) Значения по умолчанию
    const monthly_price = Number.isFinite(Number(body?.monthly_price))
      ? Number(body!.monthly_price)
      : Number(L.price || 0);

    const deposit = Number.isFinite(Number(body?.deposit))
      ? Number(body!.deposit)
      : (L.deposit == null ? null : Number(L.deposit));

    const start_date = body?.start_date ? String(body.start_date) : null;
    const end_date   = body?.end_date   ? String(body.end_date)   : null;

    // 3) Вставляем в bookings_base (НЕ во view)
    const { data: ins, error: insErr } = await sb
      .from('bookings_base')
      .insert({
        listing_id: listingId,    // uuid строкой — Supabase приведёт
        owner_id: ownerId,        // text (clerk user)
        renter_id: userId,        // text (clerk user)
        status: 'pending',        // по умолчанию
        payment_status: 'pending',
        start_date,
        end_date,
        monthly_price,
        deposit,
      })
      .select('id')
      .single();

    if (insErr) {
      return NextResponse.json({ error: 'insert_failed', message: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ id: ins!.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
