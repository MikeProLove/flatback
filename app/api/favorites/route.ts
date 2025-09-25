// app/api/favorites/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function toggle(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listing_id = String(body?.listing_id || '').trim();
    if (!listing_id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const sb = getSupabaseAdmin();

    // есть запись?
    const { data: found, error: selErr } = await sb
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listing_id)
      .maybeSingle();

    if (selErr) {
      console.error('[favorites] select', selErr);
      return NextResponse.json({ error: 'db', message: selErr.message }, { status: 500 });
    }

    if (found) {
      const { error: delErr } = await sb
        .from('favorites')
        .delete()
        .eq('id', found.id)
        .eq('user_id', userId);
      if (delErr) {
        console.error('[favorites] delete', delErr);
        return NextResponse.json({ error: 'db', message: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, favorited: false });
    } else {
      const { error: insErr } = await sb
        .from('favorites')
        .insert({ user_id: userId, listing_id });
      if (insErr) {
        // гонка по уникальному индексу: считаем "уже в избранном"
        if ((insErr as any).code === '23505') {
          return NextResponse.json({ ok: true, favorited: true });
        }
        console.error('[favorites] insert', insErr);
        return NextResponse.json({ error: 'db', message: insErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, favorited: true });
    }
  } catch (e: any) {
    console.error('[favorites] toggle', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

// Совместимость: и PATCH, и POST
export async function PATCH(req: Request) { return toggle(req); }
export async function POST(req: Request)  { return toggle(req); }
