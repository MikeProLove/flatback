// app/api/listings/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function bool(v: FormDataEntryValue | null) {
  return v === 'on' || v === 'true' || v === '1';
}
function num(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null) {
  const s = (v as string) ?? '';
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const form = await req.formData();

    // ---- поля
    const title = str(form.get('title'));
    const price = num(form.get('price')) ?? 0;
    const currency = (form.get('currency') as string) || 'RUB';

    const rooms = num(form.get('rooms'));
    const area_total = num(form.get('area_total'));
    const area_living = num(form.get('area_living'));
    const area_kitchen = num(form.get('area_kitchen'));

    const floor = num(form.get('floor'));
    const floors_total = num(form.get('floors_total'));

    const address = str(form.get('address'));
    const city = str(form.get('city'));
    const district = str(form.get('district'));
    const metro = str(form.get('metro'));
    const metro_distance_min = num(form.get('metro_distance_min'));

    const lat = num(form.get('lat'));
    const lng = num(form.get('lng'));

    const description = str(form.get('description'));

    const deposit = num(form.get('deposit'));
    const utilities_included = bool(form.get('utilities_included'));
    const pets_allowed = bool(form.get('pets_allowed'));
    const kids_allowed = bool(form.get('kids_allowed'));
    const available_from = str(form.get('available_from'));
    const min_term_months = num(form.get('min_term_months'));

    const building_type = str(form.get('building_type'));
    const renovation = str(form.get('renovation'));
    const furniture = str(form.get('furniture'));
    const balcony = bool(form.get('balcony'));
    const bathroom = str(form.get('bathroom'));
    const ceiling_height = num(form.get('ceiling_height'));
    const parking = str(form.get('parking'));
    const internet = bool(form.get('internet'));
    const concierge = bool(form.get('concierge'));
    const security = bool(form.get('security'));
    const lift = bool(form.get('lift'));

    const appliances = {
      fridge: bool(form.get('appl_fridge')),
      washer: bool(form.get('appl_washer')),
      dishwasher: bool(form.get('appl_dishwasher')),
      oven: bool(form.get('appl_oven')),
      microwave: bool(form.get('appl_microwave')),
      tv: bool(form.get('appl_tv')),
      ac: bool(form.get('appl_ac')),
    };

    const tour_url = str(form.get('tour_url'));
    const tourFile = form.get('tour_file') as File | null;
    const photos = form.getAll('photos') as File[];

    // --- админ-клиент Supabase (service role) — обходит RLS
    const sb = getSupabaseAdmin();

    // 1) запись объявления
    const { data: listingRows, error: insErr } = await sb
      .from('listings')
      .insert({
        // ВАЖНО: заполняем owner_id, чтобы удовлетворить NOT NULL
        owner_id: userId,
        // (оставляем и user_id, если он у тебя используется где-то ещё)
        user_id: userId,

        status: 'draft',
        title,
        price,
        currency,
        rooms,
        area_total,
        area_living,
        area_kitchen,
        floor,
        floors_total,
        address,
        city,
        district,
        metro,
        metro_distance_min,
        lat,
        lng,
        description,
        deposit,
        utilities_included,
        pets_allowed,
        kids_allowed,
        available_from,
        min_term_months,
        building_type,
        renovation,
        furniture,
        appliances,
        balcony,
        bathroom,
        ceiling_height,
        parking,
        internet,
        concierge,
        security,
        lift,
        tour_url,
      })
      .select('id')
      .limit(1);

    if (insErr || !listingRows?.[0]) {
      console.error('[listings] insert error', insErr);
      return NextResponse.json(
        { error: 'insert_failed', message: insErr?.message ?? 'Failed to create listing' },
        { status: 500 }
      );
    }

    const listingId = listingRows[0].id as string;

    // 2) фото -> Storage (публичный URL) -> listing_photos
    const uploaded: { url: string; path: string }[] = [];
    for (const f of photos) {
      if (!f || f.size === 0) continue;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${listingId}/${randomUUID()}.${ext}`;
      const up = await sb.storage.from('listings').upload(path, f, {
        contentType: f.type || 'image/jpeg',
        upsert: false,
      });
      if (up.error) {
        console.error('[storage] photo upload', up.error);
        continue;
      }
      const pub = sb.storage.from('listings').getPublicUrl(path);
      uploaded.push({ url: pub.data.publicUrl, path });
    }

    if (uploaded.length) {
      const rows = uploaded.map((u, idx) => ({
        listing_id: listingId,
        url: u.url,
        storage_path: u.path,
        sort_order: idx,
      }));
      const { error: photoErr } = await sb.from('listing_photos').insert(rows);
      if (photoErr) console.error('[listing_photos] insert', photoErr);
    }

    // 3) 3D-тур (если файл)
    if (tourFile && tourFile.size > 0) {
      const ext = (tourFile.name.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${userId}/${listingId}/${randomUUID()}.${ext}`;
      const up = await sb.storage.from('listings-3d').upload(tpath, tourFile, {
        contentType: tourFile.type || 'application/octet-stream',
        upsert: false,
      });
      if (!up.error) {
        await sb.from('listings').update({ tour_file_path: tpath }).eq('id', listingId);
      } else {
        console.error('[storage] tour upload', up.error);
      }
    }

    return NextResponse.json({ id: listingId });
  } catch (e: any) {
    console.error('[listings] POST error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
