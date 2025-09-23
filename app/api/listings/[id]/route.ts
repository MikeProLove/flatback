// app/api/listings/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Listing = { id: string; owner_id: string | null; user_id: string | null; tour_file_path?: string | null };

const toNum = (v: FormDataEntryValue | null) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBool = (v: FormDataEntryValue | null) => {
  if (v === null || v === undefined) return null;
  const s = String(v).toLowerCase().trim();
  return ['true', '1', 'on', 'yes'].includes(s);
};
const put = (obj: Record<string, any>, k: string, v: any) => {
  if (v !== null && v !== undefined && v !== '') obj[k] = v;
};

async function mustOwn(listingId: string, userId: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('listings')
    .select('id,owner_id,user_id,tour_file_path')
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
    if (!chk.ok) return new NextResponse(chk.code === 403 ? 'Forbidden' : 'Not Found', { status: chk.code });

    const sb = getSupabaseAdmin();
    const ct = req.headers.get('content-type') || '';

    // ===== JSON (быстрый апдейт пары полей) =====
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const allow = [
        'status','title','price','currency','rooms','area_total','area_living','area_kitchen',
        'floor','floors_total','address','city','district','metro','metro_distance_min',
        'lat','lng','description','deposit','utilities_included','pets_allowed','kids_allowed',
        'available_from','min_term_months','building_type','renovation','furniture','appliances',
        'balcony','bathroom','ceiling_height','parking','internet','concierge','security','lift','tour_url'
      ];
      const patch: Record<string, any> = {};
      for (const k of allow) if (Object.prototype.hasOwnProperty.call(body, k)) patch[k] = body[k];
      if (Object.keys(patch).length) {
        const { error } = await sb.from('listings').update(patch).eq('id', params.id);
        if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: params.id });
    }

    // ===== multipart/form-data (полный апдейт + файлы) =====
    if (!ct.includes('multipart/form-data')) {
      return new NextResponse('Unsupported Media Type', { status: 415 });
    }

    const form = await req.formData();
    const patch: Record<string, any> = {};

    // числовые
    put(patch, 'price', toNum(form.get('price')));
    put(patch, 'rooms', toNum(form.get('rooms')));
    put(patch, 'area_total', toNum(form.get('area_total')));
    put(patch, 'area_living', toNum(form.get('area_living')));
    put(patch, 'area_kitchen', toNum(form.get('area_kitchen')));
    put(patch, 'floor', toNum(form.get('floor')));
    put(patch, 'floors_total', toNum(form.get('floors_total')));
    put(patch, 'metro_distance_min', toNum(form.get('metro_distance_min')));
    put(patch, 'lat', toNum(form.get('lat')));
    put(patch, 'lng', toNum(form.get('lng')));
    put(patch, 'deposit', toNum(form.get('deposit')));
    put(patch, 'min_term_months', toNum(form.get('min_term_months')));
    put(patch, 'ceiling_height', toNum(form.get('ceiling_height')));

    // булевые
    const b = (name: string) => put(patch, name, toBool(form.get(name)));
    b('utilities_included'); b('pets_allowed'); b('kids_allowed');
    b('balcony'); b('internet'); b('concierge'); b('security'); b('lift');

    // строки/даты
    const s = (name: string) => put(patch, name, form.get(name) as string | null);
    s('status'); s('title'); s('currency'); s('address'); s('city'); s('district');
    s('metro'); s('description'); s('building_type'); s('renovation'); s('furniture');
    s('appliances'); s('bathroom'); s('parking'); s('tour_url');
    s('available_from'); // yyyy-mm-dd

    // применяем патч
    if (Object.keys(patch).length) {
      const { error } = await sb.from('listings').update(patch).eq('id', params.id);
      if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
    }

    // --- удаление отмеченных фото
    const removeIdsRaw = form.get('remove_photo_ids') as string | null;
    if (removeIdsRaw) {
      try {
        const ids: string[] = JSON.parse(removeIdsRaw);
        if (Array.isArray(ids) && ids.length) {
          const { data: rows } = await sb.from('listing_photos').select('id,storage_path').in('id', ids);
          const paths = (rows ?? []).map((r: any) => r.storage_path).filter(Boolean);
          if (paths.length) await sb.storage.from('listings').remove(paths);
          await sb.from('listing_photos').delete().in('id', ids);
        }
      } catch {/* ignore */}
    }

    // --- загрузка новых фото new_photos[]
    const files = form.getAll('new_photos') as File[];
    if (files?.length) {
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
        const up = await sb.storage.from('listings').upload(path, f, { contentType: f.type || 'image/jpeg', upsert: false });
        if (up.error) continue;
        const pub = sb.storage.from('listings').getPublicUrl(path);
        rowsToInsert.push({ listing_id: params.id, url: pub.data.publicUrl, storage_path: path, sort_order: startOrder + i });
      }
      if (rowsToInsert.length) await sb.from('listing_photos').insert(rowsToInsert);
    }

    // --- 3D-тур: удалить/перезалить/изменить ссылку
    const removeTour = toBool(form.get('remove_tour_file'));
    const newTour = form.get('tour_file') as File | null;

    if (removeTour && chk.listing.tour_file_path) {
      await sb.storage.from('listings-3d').remove([chk.listing.tour_file_path]);
      await sb.from('listings').update({ tour_file_path: null }).eq('id', params.id);
    }

    if (newTour && newTour.size > 0) {
      // удалим старый, если был
      if (chk.listing.tour_file_path) {
        await sb.storage.from('listings-3d').remove([chk.listing.tour_file_path]).catch(() => {});
      }
      const ext = (newTour.name.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${chk.ownerId}/${params.id}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('listings-3d').upload(tpath, newTour, { contentType: newTour.type || 'application/octet-stream', upsert: false });
      if (!up.error) {
        await sb.from('listings').update({ tour_file_path: tpath }).eq('id', params.id);
      }
    }

    return NextResponse.json({ ok: true, id: params.id });
  } catch (e: any) {
    console.error('[listings PATCH] error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}

export async function DELETE() {
  // DELETE уже есть у тебя — оставь как был (или скопируй из предыдущей версии)
  return new NextResponse('Not Implemented', { status: 501 });
}
