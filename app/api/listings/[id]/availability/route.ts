// app/api/listings/[id]/availability/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabaseAdmin();
    // считаем занятыми одобренные заявки (можно расширить логикой)
    const { data, error } = await sb
      .from('booking_requests')
      .select('start_date,end_date')
      .eq('listing_id', params.id)
      .eq('status', 'approved');

    if (error) throw error;

    return NextResponse.json({
      busy: (data ?? []).map((r: any) => ({
        start: r.start_date,
        end: r.end_date,
      })),
    });
  } catch (e: any) {
    console.error('[availability] GET', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}
