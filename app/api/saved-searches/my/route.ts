// app/api/saved-searches/my/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('saved_searches')
      .select('id, name, params, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
