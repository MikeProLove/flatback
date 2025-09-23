// app/api/listings/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Listing = { id: string; owner_id: string | null; user_id: string | null };

function allowKeys(src: any, keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

async function mustOwn(listingId: string, userId: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('listings')
    .select('id,owner_id,user_id')
    .eq('id', listingId)
    .maybeSingle();

  if (error || !data) return { ok: false, code: 404 as const };
  const l = data as Listing;
  const owner = l.owner_id || l.user_id;
  if (owner !== userId) return { ok: false, code: 403 as const };
  return { ok: true, listing: l, ownerId: owner! };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const chk = await mustOwn(params.id, userId);
    if (!chk.ok) {
      return new NextResponse(chk.code === 403 ? 'Forbidden' : 'Not Found', {
        status: chk.code,
      });
    }
    const sb = getSupabaseAdmin();

    const ct = req.headers.get('content-type') || '';

    // --- JSON: простое обновление полей
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const patch = allowKeys(body, [
        'status',
        'title',
        'price',
        'city',
        'rooms',
        'area_total',
        'description',
      ]);

      if (Object.keys(patch).length) {
        const { error: updErr } = await sb
          .from('listings')
          .update(patch)
          .eq('id', params.id);
        if (updErr)
          return NextResponse.json(
            { error: 'update_failed', message: updErr.message },
            { status: 500 }
          );
      }
      return NextResponse.json({ ok: true, id: params.id });
    }

    // --- multipart/form-data: поля + добавление/удаление фото
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();

      // поля
      const patch: Record<string, any> = {};
      const get = (k: string) => form.get(k) as string | null;
      const num = (v: FormDataEntryValue | null) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const put = (k: string, v: any) => {
        if (v !== null && v !== undefined && v !== '') patch[k] = v;
      };

      put('status', get('status'));
      put('title', get('title'));
      put('price', num(get('price')));
      put('city', get('city'));
      put('rooms', num(get('rooms')));
      put('area_total', num(get('area_total')));
      put('description', get('description'));

      if (Object.keys(patch).length) {
        const { error: updErr } = await sb
          .from('listings')
          .update(patch)
          .eq('id', params.id);
        if (updErr)
          return NextResponse.json(
            { error: 'update_failed', message: updErr.message },
            { status: 500 }
          );
      }

      // удаление выбранных фото
      const removeIdsRaw = get('remove_photo_ids');
      if (removeIdsRaw) {
        try {
          const ids: string[] = JSON.parse(removeIdsRaw);
          if (Array.isArray(ids) && ids.length) {
            // возьмём пути из таблицы
            const { data: rows } = await sb
              .from('listing_photos')
              .select('id,storage_path')
              .in('id', ids);
            const paths =
              rows?.map((r: any) => r.storage_path).filter(Boolean) ?? [];
            if (paths.length) {
              await sb.storage.from('listings').remove(paths);
            }
            await sb.from('listing_photos').delete().in('id', ids);
          }
        } catch (_e) {
          // игнор, не ломаем обновление
        }
      }

      // добавление новых фото (поле new_photos[])
      const files = form.getAll('new_photos') as File[];
      if (files?.length) {
        // определим текущий максимальный sort_order
        let startOrder = 0;
        const { data: last } = await sb
          .from('listing_photos')
          .select('sort_order')
          .eq('listing_id', params.id)
          .order('sort_order', { ascending: false })
          .limit(1);
        if (last?.[0]?.sort_order != null) startOrder = last[0].sort_order + 1;

        const rowsToInsert: any[] = [];

        for (const [i, f] of files.entries()) {
          if (!f || f.size === 0) continue;
          const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${chk.ownerId}/${params.id}/${crypto.randomUUID()}.${ext}`;
          const up = await sb.storage.from('listings').upload(path, f, {
            contentType: f.type || 'image/jpeg',
            upsert: false,
          });
          if (up.error) continue;

          const pub = sb.storage.from('listings').getPublicUrl(path);
          rowsToInsert.push({
            listing_id: params.id,
            url: pub.data.publicUrl,
            storage_path: path,
            sort_order: startOrder + i,
          });
        }

        if (rowsToInsert.length) {
          await sb.from('listing_photos').insert(rowsToInsert);
        }
      }

      return NextResponse.json({ ok: true, id: params.id });
    }

    return new NextResponse('Unsupported Media Type', { status: 415 });
  } catch (e: any) {
    console.error('[listings PATCH] error', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    const chk = await mustOwn(params.id, userId);
    if (!chk.ok) {
      return new NextResponse(chk.code === 403 ? 'Forbidden' : 'Not Found', {
        status: chk.code,
      });
    }

    // удалить фото + тур
    {
      const prefix = `${chk.ownerId}/${params.id}`;
      const list = await sb.storage.from('listings').list(prefix, { limit: 1000 });
      const paths = (list.data ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length) await sb.storage.from('listings').remove(paths);
    }
    {
      const prefix = `${chk.ownerId}/${params.id}`;
      const list = await sb.storage.from('listings-3d').list(prefix, { limit: 1000 });
      const paths = (list.data ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length) await sb.storage.from('listings-3d').remove(paths);
    }

    const { error: delErr } = await sb.from('listings').delete().eq('id', params.id);
    if (delErr)
      return NextResponse.json(
        { error: 'delete_failed', message: delErr.message },
        { status: 500 }
      );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[listings DELETE] error', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}
