// app/api/favorites/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_id', params.id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ isFavorite: !!data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const { error } = await sb.from('favorites').insert({ user_id: userId, listing_id: params.id });
    if (error && !String(error.message).includes('duplicate key')) {
      return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', params.id);
    if (error) return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
