// app/api/bookings/route.ts
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
  monthlyPrice?: number | null;
  deposit?: number | null;
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const listingId = (body.listingId || '').trim();
    if (!listingId) {
      return NextResponse.json(
        { error: 'bad_request', message: 'listingId обязателен' },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    // подтянем цену/залог по объявлению, если не передали
    const L = await sb
      .from('listings')
      .select('id, owner_id, user_id, price, deposit, status')
      .eq('id', listingId)
      .maybeSingle();

    if (L.error || !L.data) {
      return NextResponse.json(
        { error: 'not_found', message: 'Объявление не найдено' },
        { status: 404 }
      );
    }

    const monthly_price =
      typeof body.monthlyPrice === 'number'
        ? body.monthlyPrice
        : ((L.data.price as number | null) ?? null);

    const deposit =
      typeof body.deposit === 'number'
        ? body.deposit
        : ((L.data.deposit as number | null) ?? null);

    const start_date = body.startDate ? String(body.startDate) : null;
    const end_date = body.endDate ? String(body.endDate) : null;

    // пробуем писать в bookings; если таблицы нет — fallback в bookings_base
    const insertInto = async (table: 'bookings' | 'bookings_base') => {
      return sb
        .from(table)
        .insert({
          user_id: userId, // заявитель
          listing_id: listingId,
          status: 'pending',
          payment_status: 'pending',
          start_date,
          end_date,
          monthly_price,
          deposit,
        })
        .select('id')
        .single();
    };

    let ins = await insertInto('bookings');
    if (ins.error && /relation .*bookings.* does not exist/i.test(ins.error.message)) {
      ins = await insertInto('bookings_base');
    }
    if (ins.error || !ins.data) {
      return NextResponse.json(
        { error: 'insert_failed', message: ins.error?.message || 'Не удалось создать заявку' },
        { status: 500 }
      );
    }

    // обеспечим чат между владельцем объявления и заявителем (если ещё нет)
    const ownerId = (L.data.owner_id || L.data.user_id) as string | null;
    let chatId: string | null = null;

    if (ownerId && ownerId !== userId) {
      const ex = await sb
        .from('chats')
        .select('id')
        .eq('listing_id', listingId)
        .eq('owner_id', ownerId)
        .eq('participant_id', userId)
        .maybeSingle();

      if (ex.data?.id) {
        chatId = ex.data.id;
      } else {
        const c = await sb
          .from('chats')
          .insert({ listing_id: listingId, owner_id: ownerId, participant_id: userId })
          .select('id')
          .single();
        if (!c.error && c.data?.id) chatId = c.data.id;
      }
    }

    return NextResponse.json({
      id: ins.data.id,
      chatId,
      chatPath: chatId ? `/chat/${chatId}` : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: e?.message || 'internal' },
      { status: 500 }
    );
  }
}
