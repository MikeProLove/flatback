// app/api/bookings/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function parseDate(s: any): string | null {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isFinite(+d) ? d.toISOString().slice(0, 10) : null; // YYYY-MM-DD
}

async function hasConflict(
  sb: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  start: string,
  end: string,
  excludeId?: string
) {
  let q = sb
    .from('booking_requests')
    .select('id')
    .eq('listing_id', listingId)
    .eq('status', 'approved')
    .lte('start_date', end) // start_other <= end
    .gte('end_date', start); // end_other >= start

  if (excludeId) q = q.neq('id', excludeId);

  const { data, error } = await q.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listing_id = String(body.listing_id || '');
    const start_date = parseDate(body.start_date);
    const end_date = parseDate(body.end_date);

    if (!listing_id || !start_date || !end_date)
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const sb = getSupabaseAdmin();

    // подтянем владельца из объявления
    const { data: lst, error: e1 } = await sb
      .from('listings')
      .select('id, owner_id, price, deposit')
      .eq('id', listing_id)
      .maybeSingle();

    if (e1 || !lst) return new NextResponse('Listing not found', { status: 404 });

    // проверка пересечения
    if (await hasConflict(sb, listing_id, start_date, end_date)) {
      return NextResponse.json(
        { error: 'dates_unavailable', message: 'Выбранные даты уже заняты' },
        { status: 409 }
      );
    }

    const monthly_price =
      typeof body.monthly_price === 'number' ? body.monthly_price : Number(lst.price ?? 0);
    const deposit =
      typeof body.deposit === 'number' ? body.deposit : Number(lst.deposit ?? 0);

    const { data: ins, error: e2 } = await sb
      .from('booking_requests')
      .insert({
        listing_id,
        owner_id: lst.owner_id,
        tenant_id: userId,
        start_date,
        end_date,
        monthly_price,
        deposit,
        status: 'pending',
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (e2) throw e2;

    return NextResponse.json({ id: ins.id });
  } catch (e: any) {
    console.error('[bookings] POST', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}
