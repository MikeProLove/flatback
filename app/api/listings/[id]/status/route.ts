// app/api/listings/[id]/status/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Row = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  title: string | null;
  price: number | null;
  lat: number | null;
  lng: number | null;
  status: string | null;
  photos_cnt: number;
};

// проверяем, что текущий пользователь владелец
async function assertOwner(sb: ReturnType<typeof getSupabaseAdmin>, id: string, userId: string) {
  const { data, error } = await sb
    .from('listings')
    .select('id, owner_id, user_id')
    .eq('id', id)
    .limit(1)
    .maybeSingle<{ id: string; owner_id: string | null; user_id: string | null }>();
  if (error) return { ok: false as const, status: 500, message: 'db_error' };
  if (!data) return { ok: false as const, status: 404, message: 'not_found' };
  const owner = data.owner_id || data.user_id;
  if (!owner || owner !== userId) return { ok: false as const, status: 403, message: 'forbidden' };
  return { ok: true as const };
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const ok = await assertOwner(sb, params.id, userId);
    if (!ok.ok) return new NextResponse(ok.message, { status: ok.status });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').toLowerCase(); // 'publish' | 'unpublish'

    if (action !== 'publish' && action !== 'unpublish') {
      return NextResponse.json({ error: 'bad_request', message: 'Unknown action' }, { status: 400 });
    }

    if (action === 'unpublish') {
      const { error } = await sb.from('listings').update({ status: 'draft' }).eq('id', params.id);
      if (error) {
        console.error('[status] unpublish', error);
        return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, status: 'draft' });
    }

    // publish: вытянем необходимые поля + посчитаем фото
    const { data, error } = await sb
      .from('listings')
      .select(`
        id, owner_id, user_id, title, price, lat, lng, status,
        photos_cnt: listing_photos(count)
      `)
      .eq('id', params.id)
      .maybeSingle<Row>();

    if (error) {
      console.error('[status] select', error);
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const ready =
      (data.title ?? '').trim().length > 0 &&
      Number(data.price) > 0 &&
      data.lat != null &&
      data.lng != null &&
      Number(data.photos_cnt) > 0;

    if (!ready) {
      return NextResponse.json(
        {
          error: 'not_ready',
          message:
            'Для публикации нужны: заголовок, цена > 0, координаты (lat/lng) и хотя бы одно фото.',
        },
        { status: 400 }
      );
    }

    const { error: upErr } = await sb.from('listings').update({ status: 'published' }).eq('id', params.id);
    if (upErr) {
      console.error('[status] publish', upErr);
      return NextResponse.json({ error: 'update_failed', message: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'published' });
  } catch (e: any) {
    console.error('[status] POST error', e);
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}
