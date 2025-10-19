// app/api/bookings/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server'; // важна RLS-сессия
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  listingId?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const listingId = body?.listingId;
    const start_date = body?.start_date ?? null;
    const end_date = body?.end_date ?? null;

    if (!listingId) {
      return NextResponse.json({ error: 'bad_request', message: 'listingId обязателен' }, { status: 400 });
    }

    // 1) подтянем объявление (через админа, нам нужны цена/депозит/владелец)
    const admin = getSupabaseAdmin();
    const L = await admin
      .from('listings')
      .select('id, owner_id, user_id, price, deposit, status')
      .eq('id', listingId)
      .maybeSingle();
    if (L.error || !L.data) {
      return NextResponse.json({ error: 'not_found', message: 'Объявление не найдено' }, { status: 404 });
    }
    if (L.data.status !== 'published') {
      return NextResponse.json({ error: 'not_published', message: 'Объявление не опубликовано' }, { status: 409 });
    }

    const owner = L.data.owner_id || L.data.user_id;
    if (!owner) {
      return NextResponse.json({ error: 'no_owner', message: 'У объявления не найден владелец' }, { status: 409 });
    }
    if (owner === userId) {
      return NextResponse.json({ error: 'self_booking', message: 'Нельзя отправить заявку на своё объявление' }, { status: 409 });
    }

    // 2) создаём заявку (через user-сессию, чтобы RLS/политики отработали)
    const sb = getSupabaseServer();

    const ins = await sb
      .from('bookings')
      .insert({
        listing_id: listingId,
        user_id: userId,            // заявитель
        status: 'pending',
        payment_status: 'pending',
        start_date,
        end_date,
        monthly_price: L.data.price ?? null,
        deposit: L.data.deposit ?? null,
      })
      .select('id')
      .single();

    if (ins.error) {
      return NextResponse.json({ error: 'insert_failed', message: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ id: ins.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
