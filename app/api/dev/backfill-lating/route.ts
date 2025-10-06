// app/api/dev/backfill-latlng/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { geocodeAddress } from '@/lib/geocode';

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // только ваши объявления
    const { data: rows } = await sb
      .from('listings')
      .select('id, city, address')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
      .is('lat', null)
      .is('lng', null)
      .limit(50);

    let updated = 0;

    for (const r of rows ?? []) {
      const q = [r.city, r.address].filter(Boolean).join(', ');
      if (!q) continue;
      const geo = await geocodeAddress(q);
      if (!geo) continue;

      const { error } = await sb.from('listings')
        .update({ lat: geo.lat, lng: geo.lng })
        .eq('id', r.id);
      if (!error) updated++;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    console.error('[backfill-latlng] error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
