// app/api/listings/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Listing = { id: string; owner_id: string | null; user_id: string | null };

async function mustOwn(listingId: string, userId: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('listings').select('id,owner_id,user_id').eq('id', listingId).maybeSingle();
  if (error || !data) return { ok: false, code: 404 as const };
  const l = data as Listing;
  const owner = l.owner_id || l.user_id;
  if (owner !== userId) return { ok: false, code: 403 as const };
  return { ok: true, listing: l };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const check = await mustOwn(params.id, userId);
    if (!check.ok) return new NextResponse(check.code === 403 ? 'Forbidden' : 'Not Found', { status: check.code });

    const sb = getSupabaseAdmin();

    // Поддержим JSON и multipart/form-data (минимально: статус и базовые поля)
    const ct = req.headers.get('content-type') || '';
    let patch: Record<string, any> = {};

    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const allow = ['status','title','price','city','rooms','area_total','description'];
      for (const k of allow) if (body[k] !== undefined) patch[k] = body[k];
    } else if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const get = (k: string) => form.get(k) as string | null;
      const num = (v: FormDataEntryValue | null) => {
        const n = Number(v); return Number.isFinite(n) ? n : null;
      };
      const put = (k: string, v: any) => { if (v !== null && v !== undefined && v !== '') patch[k] = v; };

      put('status', get('status'));
      put('title', get('title'));
      put('price', num(get('price')));
      put('city', get('city'));
      put('rooms', num(get('rooms')));
      put('area_total', num(get('area_total')));
      put('description', get('description'));
      // (добавить остальные поля при желании)
    } else {
      return new NextResponse('Unsupported Media Type', { status: 415 });
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, id: params.id });
    }

    const { error: updErr } = await sb.from('listings').update(patch).eq('id', params.id);
    if (updErr) {
      console.error('[listings PATCH] update', updErr);
      return NextResponse.json({ error: 'update_failed', message: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: params.id });
  } catch (e: any) {
    console.error('[listings PATCH] error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // проверим владение и соберём пути к файлам
    const check = await mustOwn(params.id, userId);
    if (!check.ok) return new NextResponse(check.code === 403 ? 'Forbidden' : 'Not Found', { status: check.code });

    // удалим файлы в storage (фото)
    {
      const prefix = `${userId}/${params.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 1000 });
      const paths = (list.data ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length) {
        await sb.storage.from('listings').remove(paths);
      }
    }
    // удалим файлы тура
    {
      const prefix = `${userId}/${params.id}`;
      const list = await sb.storage.from('listings-3d').list(prefix, { limit: 1000 });
      const paths = (list.data ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length) {
        await sb.storage.from('listings-3d').remove(paths);
      }
    }

    // удалим запись (каскадом удалит listing_photos)
    const { error: delErr } = await sb.from('listings').delete().eq('id', params.id);
    if (delErr) {
      console.error('[listings DELETE] delete', delErr);
      return NextResponse.json({ error: 'delete_failed', message: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[listings DELETE] error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
