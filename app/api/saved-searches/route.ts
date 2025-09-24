// app/api/saved-searches/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = (body?.name ?? '').toString().slice(0, 120) || null;
    const params = body?.params && typeof body.params === 'object' ? body.params : {};

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from('saved_searches')
      .insert({ user_id: userId, name, params });

    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
