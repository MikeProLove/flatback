// app/api/listings/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { geocodeAddress } from '@/lib/geocode';

/* ───────── helpers ───────── */
const toNum = (v: any) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v: any) =>
  v === true || v === 'true' || v === '1' || v === 1;

type ListingRow = {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  tour_file_path: string | null;
  city: string | null;
  address: string | null;
};

async function assertOwner(
  sb: ReturnType<typeof getSupabaseAdmin>,
  id: string,
  userId: string
) {
  const { data, error } = await sb
    .from('listings')
    .select('id, owner_id, user_id, tour_file_path, city, address')
    .eq('id', id)
    .limit(1)
    .maybeSingle<ListingRow>();

  if (error) return { ok: false as const, status: 500, message: 'db_error', row: null as ListingRow | null };
  if (!data) return { ok: false as const, status: 404, message: 'not_found', row: null as ListingRow | null };

  const owner = data.owner_id || data.user_id;
  if (!owner || owner !== userId) {
    return { ok: false as const, status: 403, message: 'forbidden', row: null as ListingRow | null };
  }
  return { ok: true as const, status: 200, message: 'ok', row: data };
}

/* ───────── PATCH /api/listings/[id] ───────── */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const check = await assertOwner(sb, params.id, userId);
    if (!check.ok || !check.row) {
      return new NextResponse(check.message, { status: check.status });
    }
    const ownerId = check.row.owner_id || check.row.user_id!;
    const form = await req.formData();

    // Собираем данные обновления
    const updates: Record<string, any> = {};

    // строки
    const strKeys = [
      'title', 'city', 'district', 'address', 'description',
      'currency', 'building_type', 'renovation', 'furniture',
      'appliances', 'internet', 'parking', 'balcony',
      'bathroom', 'security', 'lift', 'concierge', 'metro', 'status',
    ] as const;

    for (const k of strKeys) {
      const v = form.get(k as string);
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        updates[k] = String(v).trim();
      }
    }

    // числа
    const numKeys = [
      'price', 'rooms', 'area_total', 'area_living', 'area_kitchen',
      'floor', 'floors_total', 'deposit', 'metro_distance_min',
      'ceiling_height', 'lat', 'lng', 'min_term_months',
    ] as const;

    for (const k of numKeys) {
      const v = toNum(form.get(k as string));
      if (v !== null) updates[k] = v;
    }

    // булевы
    for (const k of ['utilities_included', 'pets_allowed', 'kids_allowed'] as const) {
      const raw = form.get(k);
      if (raw !== null) updates[k] = toBool(raw);
    }

    // даты
    const available_from = form.get('available_from');
    if (available_from && String(available_from).trim() !== '') {
      updates['available_from'] = String(available_from);
    }

    // Если поменяли адрес/город и не передали явные lat/lng — автогеокодим
    const addressChanged = 'address' in updates;
    const cityChanged = 'city' in updates;
    const latProvided = 'lat' in updates;
    const lngProvided = 'lng' in updates;

    if ((addressChanged || cityChanged) && !(latProvided && lngProvided)) {
      const qAddress = (updates.address ?? check.row.address) ?? '';
      const qCity = (updates.city ?? check.row.city) ?? '';
      const q = [qAddress, qCity].filter(Boolean).join(', ');
      if (q) {
        const geo = await geocodeAddress(q);
        if (geo) {
          updates.lat = geo.lat;
          updates.lng = geo.lng;
        }
      }
    }

    // Применяем обновление
    if (Object.keys(updates).length) {
      const { error: upErr } = await sb.from('listings').update(updates).eq('id', params.id);
      if (upErr) {
        console.error('[listings PATCH] update', upErr);
        return NextResponse.json({ error: 'update_failed', message: upErr.message }, { status: 500 });
      }
    }

    // Фото (массив input name="photos")
    const files = form.getAll('photos') as File[];
    const rowsToInsert: { listing_id: string; url: string; storage_path: string; sort_order: number }[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f || (f as any).size === 0) continue;

      const ext = ((f as any).name?.split('.').pop() || 'jpg').toLowerCase();
      const path = `${ownerId}/${params.id}/${crypto.randomUUID()}.${ext}`;

      const up = await sb.storage.from('listings').upload(path, f as any, {
        contentType: (f as any).type || 'image/jpeg',
        upsert: false,
      });
      if (up.error) {
        console.error('[storage] photo upload', up.error);
        continue;
      }

      const pub = sb.storage.from('listings').getPublicUrl(path);
      rowsToInsert.push({
        listing_id: params.id,
        url: pub.data.publicUrl,
        storage_path: path,
        sort_order: i,
      });
    }

    if (rowsToInsert.length) {
      const { error: photoErr } = await sb.from('listing_photos').insert(rowsToInsert);
      if (photoErr) console.error('[listing_photos] insert', photoErr);
    }

    // Удаление 3D-тура по флажку
    const removeTour = toBool(form.get('remove_tour'));
    if (removeTour && check.row.tour_file_path) {
      await sb.storage.from('listings-3d').remove([check.row.tour_file_path]);
      await sb.from('listings').update({ tour_file_path: null }).eq('id', params.id);
    }

    // Загрузка нового 3D-тура
    const tourFile = form.get('tour_file') as File | null;
    if (tourFile && (tourFile as any).size > 0) {
      const ext = (((tourFile as any).name as string)?.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${ownerId}/${params.id}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('listings-3d').upload(tpath, tourFile as any, {
        contentType: (tourFile as any).type || 'application/octet-stream',
        upsert: false,
      });
      if (!up.error) {
        await sb.from('listings').update({ tour_file_path: tpath }).eq('id', params.id);
      } else {
        console.error('[storage] tour upload', up.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[listings PATCH] error', e);
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}

/* ───────── DELETE /api/listings/[id] ───────── */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const check = await assertOwner(sb, params.id, userId);
    if (!check.ok || !check.row) return new NextResponse(check.message, { status: check.status });

    const ownerId = check.row.owner_id || check.row.user_id!;

    // Удаляем все фото из storage
    const prefix = `${ownerId}/${params.id}`;
    const listed = await sb.storage.from('listings').list(prefix, { limit: 1000 });
    if (!listed.error && listed.data?.length) {
      const paths = listed.data.map((f) => `${prefix}/${f.name}`);
      await sb.storage.from('listings').remove(paths);
    }

    // Удаляем 3D-тур
    if (check.row.tour_file_path) {
      await sb.storage.from('listings-3d').remove([check.row.tour_file_path]);
    }

    // Очищаем таблицу фотографий (если нет ON DELETE CASCADE)
    await sb.from('listing_photos').delete().eq('listing_id', params.id);

    // Удаляем объявление
    const { error: delErr } = await sb.from('listings').delete().eq('id', params.id);
    if (delErr) {
      console.error('[listings DELETE] delete', delErr);
      return NextResponse.json({ error: 'delete_failed', message: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[listings DELETE] error', e);
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}
