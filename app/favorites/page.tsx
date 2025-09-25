export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function parseBody = async (req: Request) => {
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await req.json();
      return String(j?.listing_id || '').trim();
    } else {
      const fd = await req.formData();
      return String(fd.get('listing_id') || '').trim();
    }
  } catch {
    return '';
  }
};

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'unauthorized', message: 'not signed in' }, { status: 401 });

    const listing_id = await parseBody(req);
    if (!listing_id) return NextResponse.json({ error: 'bad_request', message: 'listing_id is required' }, { status: 400 });

    const sb = getSupabaseAdmin();

    const { data: found, error: selErr } = await sb
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listing_id)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ error: 'db_select', message: selErr.message }, { status: 500 });
    }

    if (found) {
      const { error: delErr } = await sb.from('favorites').delete().eq('id', found.id).eq('user_id', userId);
      if (delErr) {
        return NextResponse.json({ error: 'db_delete', message: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, favorited: false });
    } else {
      const { error: insErr } = await sb.from('favorites').insert({ user_id: userId, listing_id });
      if (insErr) {
        // гонка по уникальному индексу — считаем "уже в избранном"
        if ((insErr as any).code === '23505') return NextResponse.json({ ok: true, favorited: true });
        return NextResponse.json({ error: 'db_insert', message: insErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, favorited: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

// на всякий — поддержим POST тоже
export async function POST(req: Request) {
  return PATCH(req);
}
