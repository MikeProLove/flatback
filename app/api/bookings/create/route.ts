import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Вставляем в РЕАЛЬНУЮ таблицу bookings (не в view)
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const listing_id: string | null = body?.listing_id ?? null;
    const start_date: string | null = body?.start_date ?? null;
    const end_date: string | null = body?.end_date ?? null;

    if (!listing_id) {
      return NextResponse.json({ error: 'no_listing_id' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Подтянем объявление, заодно узнаем владельца и цены
    const { data: listing, error: e0 } = await sb
      .from('listings')
      .select('id, owner_id, user_id, price, deposit, currency')
      .eq('id', listing_id)
      .maybeSingle();

    if (e0) return NextResponse.json({ error: e0.message }, { status: 400 });
    if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });

    const owner = listing.owner_id ?? listing.user_id;
    if (owner === userId) {
      return NextResponse.json({ error: 'self_booking' }, { status: 400 });
    }

    // Вставка в ТАБЛИЦУ bookings.
    // ВАЖНО: если у вас в таблице поле арендатора называется иначе (например, renter_id),
    // поменяйте user_id -> renter_id.
    const insertPayload: any = {
      listing_id,
      user_id: userId,                 // <-- переименуйте на renter_id, если так в схеме
      status: 'pending',
      payment_status: 'pending',
      start_date,
      end_date,
      monthly_price: listing.price ?? null,
      deposit: listing.deposit ?? null,
    };

    const { data: created, error: e1 } = await sb
      .from('bookings')
      .insert(insertPayload)
      .select('id')
      .single();

    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
