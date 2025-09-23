// app/api/bookings/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isFinite(+d) ? d : null;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { listingId, startDate, endDate, message } = body ?? {};

    if (!listingId) return new NextResponse('listingId required', { status: 400 });

    const start = toDate(startDate);
    const end = toDate(endDate);
    if (!start || !end || end <= start) {
      return new NextResponse('invalid dates', { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // получаем объявление
    const { data: l } = await sb.from('listings').select('id, owner_id, user_id, status, price, deposit').eq('id', listingId).maybeSingle();
    if (!l) return new NextResponse('Listing not found', { status: 404 });

    const owner = (l.owner_id as string | null) || (l.user_id as string | null);
    if (!owner) return new NextResponse('Listing has no owner', { status: 409 });
    if (owner === userId) return new NextResponse('Owner cannot request', { status: 403 });
    if (l.status !== 'published') return new NextResponse('Listing not published', { status: 409 });

    const { data: row, error: insErr } = await sb
      .from('booking_requests')
      .insert({
        listing_id: listingId,
        owner_id: owner,
        tenant_id: userId,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        monthly_price: Number(l.price || 0),
        deposit: Number(l.deposit || 0),
        message: (message as string) || null,
        status: 'pending',
      })
      .select('id')
      .limit(1)
      .maybeSingle();

    if (insErr || !row) {
      console.error('[bookings] insert', insErr);
      return NextResponse.json({ error: 'insert_failed', message: insErr?.message }, { status: 500 });
    }

    return NextResponse.json({ id: row.id });
  } catch (e: any) {
    console.error('[bookings] POST error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
