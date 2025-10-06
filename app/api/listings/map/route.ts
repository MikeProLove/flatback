// app/api/listings/map/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // если нет вьюхи listings_with_cover — замени на 'listings' (и исключи cover_url)
    const { data, error } = await sb
      .from('listings_with_cover')
      .select('id,title,price,city,lat,lng,cover_url')
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(1000);

    if (error) {
      console.error('[map] supabase error', error);
      return NextResponse.json(
        { error: 'db_error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    console.error('[map] GET error', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}
