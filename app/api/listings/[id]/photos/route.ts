// app/api/listings/[id]/photos/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function assertOwner(sb: ReturnType<typeof getSupabaseAdmin>, listingId: string, userId: string) {
  const { data, error } = await sb
    .from('listings')
    .select('id, owner_id, user_id')
    .eq('id', listingId)
    .maybeSingle<{ id: string; owner_id: string | null; user_id: string | null }>();

  if (error || !data) return null;
  const owner = data.owner_id || data.user_id;
  return owner === userId ? data : null;
}

async function removePhoto(listingId: string, req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const own = await assertOwner(sb, listingId, userId);
  if (!own) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // payload из JSON и/или query
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const url = new URL(req.url);
  const photoId = payload.photo_id ?? url.searchParams.get('photo_id') ?? undefined;
  const storagePath = payload.storage_path ?? url.searchParams.get('storage_path') ?? undefined;

  if (!photoId && !storagePath) {
    return NextResponse.json({ error: 'photo_id_required', message: 'Укажите photo_id или storage_path' }, { status: 400 });
  }

  // найдём запись фото
  let row:
    | { id: string; listing_id: string; storage_path: string | null }
    | null = null;

  if (photoId) {
    const q = await sb
      .from('listing_photos')
      .select('id, listing_id, storage_path')
      .eq('id', String(photoId))
      .eq('listing_id', listingId)
      .maybeSingle();
    if (!q.error && q.data) row = q.data;
  }

  if (!row && storagePath) {
    const q2 = await sb
      .from('listing_photos')
      .select('id, listing_id, storage_path')
      .eq('listing_id', listingId)
      .eq('storage_path', String(storagePath))
      .maybeSingle();
    if (!q2.error && q2.data) row = q2.data;
  }

  if (!row) {
    // если строки нет — попробуем всё равно убрать файл, если пришёл путь
    if (storagePath) await sb.storage.from('listings').remove([String(storagePath)]).catch(() => {});
    return NextResponse.json({ ok: true, note: 'record_not_found' });
  }

  // удалить файл в сторидже (если был сохранён путь)
  if (row.storage_path) {
    const r = await sb.storage.from('listings').remove([row.storage_path]);
    if (r.error) {
      // не валим процесс — просто отдаём примечание
      console.error('[storage.remove] ', r.error);
    }
  }

  // удалить запись в таблице
  const del = await sb.from('listing_photos').delete().eq('id', row.id);
  if (del.error) {
    return NextResponse.json({ error: 'delete_failed', message: del.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return removePhoto(params.id, req);
}

// на всякий — разрешим POST с тем же телом (если браузер/инфра режет DELETE)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return removePhoto(params.id, req);
}
