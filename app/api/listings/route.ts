// app/api/listings/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';

function bool(v: FormDataEntryValue | null) {
  return v === 'on' || v === 'true' || v === '1';
}
function num(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const form = await req.formData();

    // Основные поля
    const title = (form.get('title') as string) || null;
    const price = num(form.get('price')) || 0;
    const currency = (form.get('currency') as string) || 'RUB';

    const rooms = num(form.get('rooms'));
    const area_total = num(form.get('area_total'));
    const area_living = num(form.get('area_living'));
    const area_kitchen = num(form.get('area_kitchen'));

    const floor = num(form.get('floor'));
    const floors_total = num(form.get('floors_total'));

    const address = (form.get('address') as string) || null;
    const city = (form.get('city') as string) || null;
    const district = (form.get('district') as string) || null;
    const metro = (form.get('metro') as string) || null;
    const metro_distance_min = num(form.get('metro_distance_min'));

    const lat = num(form.get('lat'));
    const lng = num(form.get('lng'));

    const description = (form.get('description') as string) || null;

    const deposit = num(form.get('deposit'));
    const utilities_included = bool(form.get('utilities_included'));
    const pets_allowed = bool(form.get('pets_allowed'));
    const kids_allowed = bool(form.get('kids_allowed'));
    const available_from = (form.get('available_from') as string) || null;
    const min_term_months = num(form.get('min_term_months'));

    const building_type = (form.get('building_type') as string) || null;
    const renovation = (form.get('renovation') as string) || null;
    const furniture = (form.get('furniture') as string) || null;
    const balcony = bool(form.get('balcony'));
    const bathroom = (form.get('bathroom') as string) || null;
    const ceiling_height = num(form.get('ceiling_height'));
    const parking = (form.get('parking') as string) || null;
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

    const tour_url = (form.get('tour_url') as string) || null;
    const tourFile = form.get('tour_file') as File | null;
    const photos = form.getAll('photos') as File[];

    const supabase = getSupabaseServer();

    // 1) создаём объявление (draft)
    const { data: listingRows, error: insErr } = await supabase
      .from('listings')
      .insert({
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
      console.error('[listings] insert', insErr);
      return new NextResponse('Failed to create listing', { status: 500 });
    }
    const listingId = listingRows[0].id as string;

    // 2) загрузка фото в storage
    const uploaded: { url: string; path: string }[] = [];
    for (let i = 0; i < photos.length; i++) {
      const f = photos[i];
      if (!f || f.size === 0) continue;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from('listings')
        .upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) {
        console.error('[storage] photo upload', up.error);
        continue;
      }
      const pub = supabase.storage.from('listings').getPublicUrl(path);
      uploaded.push({ url: pub.data.publicUrl, path });
    }

    if (uploaded.length) {
      const rows = uploaded.map((u, idx) => ({
        listing_id: listingId,
        url: u.url,
        storage_path: u.path,
        sort_order: idx,
      }));
      const { error: photoErr } = await supabase.from('listing_photos').insert(rows);
      if (photoErr) console.error('[listing_photos] insert', photoErr);
    }

    // 3) загрузка файла 3D-тура (если есть)
    if (tourFile && tourFile.size > 0) {
      const ext = (tourFile.name.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from('listings-3d')
        .upload(tpath, tourFile, { contentType: tourFile.type, upsert: false });
      if (!up.error) {
        await supabase
          .from('listings')
          .update({ tour_file_path: tpath })
          .eq('id', listingId);
      } else {
        console.error('[storage] tour upload', up.error);
      }
    }

    return NextResponse.json({ id: listingId });
  } catch (e) {
    console.error('[listings] POST error', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
