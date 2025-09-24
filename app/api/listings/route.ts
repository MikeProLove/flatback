// app/api/listings/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function str(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function num(form: FormData, name: string): number | null {
  const v = form.get(name);
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(form: FormData, name: string): boolean {
  // чекбокс приходит как "on" при наличии
  return form.has(name) && String(form.get(name)).toLowerCase() !== 'false';
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const form = await req.formData();

    // --- ЧИТАЕМ ПОЛЯ ФОРМЫ ---
    const title = str(form, 'title') ?? 'Объявление'; // ← дефолт, чтобы не падало на NOT NULL
    const city = str(form, 'city');
    const address = str(form, 'address');
    const district = str(form, 'district');
    const description = str(form, 'description');
    const currency = (str(form, 'currency') ?? 'RUB') as 'RUB' | 'USD' | 'EUR';

    const metro = str(form, 'metro');
    const metro_distance_min = num(form, 'metro_distance_min');

    const rooms = num(form, 'rooms');
    const area_total = num(form, 'area_total');
    const area_living = num(form, 'area_living');
    const area_kitchen = num(form, 'area_kitchen');

    const floor = num(form, 'floor');
    const floors_total = num(form, 'floors_total');

    const price = num(form, 'price');
    const deposit = num(form, 'deposit');

    const lat = num(form, 'lat');
    const lng = num(form, 'lng');

    const available_from = str(form, 'available_from');
    const min_term_months = num(form, 'min_term_months');

    const building_type = str(form, 'building_type');
    const renovation = str(form, 'renovation');
    const furniture = str(form, 'furniture');
    const appliances = str(form, 'appliances');
    const balcony = str(form, 'balcony');
    const bathroom = str(form, 'bathroom');
    const ceiling_height = num(form, 'ceiling_height');
    const parking = str(form, 'parking');
    const internet = str(form, 'internet');
    const concierge = str(form, 'concierge');
    const security = str(form, 'security');
    const lift = str(form, 'lift');

    const utilities_included = bool(form, 'utilities_included');
    const pets_allowed = bool(form, 'pets_allowed');
    const kids_allowed = bool(form, 'kids_allowed');

    const tour_url = str(form, 'tour_url'); // если даёшь ссылкой

    const supabase = getSupabaseServer(); // для таблиц под RLS, если есть
    const admin = getSupabaseAdmin();     // для storage

    // 1) создаём запись в listings
    const { data: listingRows, error: insErr } = await supabase
      .from('listings')
      .insert({
        owner_id: userId,       // важно: заполняем владельца
        user_id: userId,        // если колонка есть — тоже заполним
        status: 'draft',

        title,
        city,
        address,
        district,
        description,

        currency,
        price,
        deposit,

        rooms,
        area_total,
        area_living,
        area_kitchen,

        floor,
        floors_total,

        metro,
        metro_distance_min,

        lat,
        lng,

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
      return NextResponse.json(
        { error: 'insert_failed', message: insErr?.message || 'Failed to create listing' },
        { status: 500 }
      );
    }

    const listingId = listingRows[0].id as string;

    // 2) фото — загружаем в storage и пишем в listing_photos
    const photos = form.getAll('photos') as File[];
    const uploaded: { url: string; path: string }[] = [];
    for (const f of photos) {
      if (!f || f.size === 0) continue;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from('listings').upload(path, f, {
        contentType: f.type,
        upsert: false,
      });
      if (up.error) {
        console.error('[storage] photo upload', up.error);
        continue;
      }
      const pub = admin.storage.from('listings').getPublicUrl(path);
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

    // 3) 3D-тур — файл
    const tourFile = form.get('tour_file') as File | null;
    if (tourFile && tourFile.size > 0) {
      const ext = (tourFile.name.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from('listings-3d').upload(tpath, tourFile, {
        contentType: tourFile.type,
        upsert: false,
      });
      if (!up.error) {
        await supabase.from('listings').update({ tour_file_path: tpath }).eq('id', listingId);
      } else {
        console.error('[storage] tour upload', up.error);
      }
    }

    return NextResponse.json({ id: listingId });
  } catch (e: any) {
    console.error('[listings] POST error', e);
    return NextResponse.json({ error: 'server_error', message: e?.message ?? 'Internal' }, { status: 500 });
  }
}
