// app/api/listings/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin'; // ← добавили

// ...helpers bool/num остаются...

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const form = await req.formData();
    // ...считываем все поля как раньше...

    const supabase = getSupabaseServer(); // для таблиц
    const admin = getSupabaseAdmin();     // для storage

    // 1) создаём запись в public.listings (как было)
    const { data: listingRows, error: insErr } = await supabase
      .from('listings')
      .insert({
        user_id: userId,
        status: 'draft',
        // ...все поля...
        title, price, currency, rooms, area_total, area_living, area_kitchen,
        floor, floors_total, address, city, district, metro, metro_distance_min,
        lat, lng, description, deposit, utilities_included, pets_allowed,
        kids_allowed, available_from, min_term_months, building_type, renovation,
        furniture, appliances, balcony, bathroom, ceiling_height, parking,
        internet, concierge, security, lift, tour_url,
      })
      .select('id')
      .limit(1);

    if (insErr || !listingRows?.[0]) {
      console.error('[listings] insert', insErr);
      return new NextResponse('Failed to create listing', { status: 500 });
    }
    const listingId = listingRows[0].id as string;

    // 2) фото — загружаем через admin (обходит RLS)
    const photos = form.getAll('photos') as File[];
    const uploaded: { url: string; path: string }[] = [];
    for (const f of photos) {
      if (!f || f.size === 0) continue;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from('listings').upload(path, f, {
        contentType: f.type, upsert: false,
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

    // 3) 3D-тур — тоже через admin
    const tourFile = form.get('tour_file') as File | null;
    if (tourFile && tourFile.size > 0) {
      const ext = (tourFile.name.split('.').pop() || 'bin').toLowerCase();
      const tpath = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from('listings-3d').upload(tpath, tourFile, {
        contentType: tourFile.type, upsert: false,
      });
      if (!up.error) {
        await supabase.from('listings').update({ tour_file_path: tpath }).eq('id', listingId);
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
