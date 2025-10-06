// app/api/listings/[id]/status/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { geocodeAddress } from '@/lib/geocode';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action: 'publish' | 'unpublish' | undefined = body?.action;
    if (!action) return NextResponse.json({ error: 'bad_action' }, { status: 400 });

    const sb = getSupabaseAdmin();

    // читаем объявление
    const { data: l, error } = await sb
      .from('listings')
      .select('id,title,price,lat,lng,city,address,owner_id,user_id,status')
      .eq('id', params.id)
      .maybeSingle();

    if (error || !l) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const owner = l.owner_id || l.user_id;
    if (owner !== userId) return new NextResponse('Forbidden', { status: 403 });

    // Снять с публикации — сразу
    if (action === 'unpublish') {
      const { error: upErr } = await sb.from('listings').update({ status: 'draft' }).eq('id', l.id);
      if (upErr) return NextResponse.json({ error: 'update_failed', message: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, status: 'draft' });
    }

    // Иначе — публикуем c авто-починкой
    let lat = l.lat, lng = l.lng;

    // 1) координаты
    if (lat == null || lng == null) {
      const q = [l.city, l.address].filter(Boolean).join(', ');
      if (q) {
        const geo = await geocodeAddress(q);
        if (geo) {
          lat = geo.lat; lng = geo.lng;
          await sb.from('listings').update({ lat, lng }).eq('id', l.id);
        }
      }
    }

    // 2) фото — есть ли хоть одно?
    const { count: c1 } = await sb
      .from('listing_photos')
      .select('id', { head: true, count: 'exact' })
      .eq('listing_id', l.id);

    if (!c1 || c1 === 0) {
      // пробуем достать из Storage
      const prefix = `${owner}/${l.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 10 });
      if (list?.data?.length) {
        const rows = list.data.map((f, i) => {
          const path = `${prefix}/${f.name}`;
          const pub = sb.storage.from('listings').getPublicUrl(path);
          return {
            listing_id: l.id,
            url: pub.data.publicUrl,
            storage_path: path,
            sort_order: i,
          };
        });
        await sb.from('listing_photos').insert(rows);
      }
    }

    // 3) проверяем готовность
    const readyTitle = !!(l.title && l.title.trim());
    const readyPrice = Number(l.price) > 0;
    const readyCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    const { count: c2 } = await sb
      .from('listing_photos')
      .select('id', { head: true, count: 'exact' })
      .eq('listing_id', l.id);

    if (!readyTitle || !readyPrice || !readyCoords || !c2) {
      return NextResponse.json(
        { error: 'not_ready',
          message: 'Для публикации нужны: заголовок, цена > 0, координаты (lat/lng) и хотя бы одно фото.' },
        { status: 400 }
      );
    }

    // 4) публикуем
    const { error: up2 } = await sb.from('listings').update({ status: 'published' }).eq('id', l.id);
    if (up2) return NextResponse.json({ error: 'update_failed', message: up2.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: 'published' });
  } catch (e: any) {
    console.error('[status] error', e);
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}
