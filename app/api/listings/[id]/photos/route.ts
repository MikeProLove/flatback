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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();
    const ownerOk = await assertOwner(sb, params.id, userId);
    if (!ownerOk) return new NextResponse('Forbidden', { status: 403 });

    const body = await req.json().catch(() => ({}));
    const photoId: string | undefined = body?.photo_id;
    if (!photoId) return NextResponse.json({ error: 'photo_id_required' }, { status: 400 });

    const photo = await sb
      .from('listing_photos')
      .select('id, listing_id, storage_path')
      .eq('id', photoId)
      .eq('listing_id', params.id)
      .maybeSingle<{ id: string; listing_id: string; storage_path: string | null }>();

    if (photo.error || !photo.data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // удаляем файл из storage (если знаем путь)
    const path = photo.data.storage_path;
    if (path) {
      await sb.storage.from('listings').remove([path]);
    }

    // удаляем строку из таблицы
    const del = await sb.from('listing_photos').delete().eq('id', photoId);
    if (del.error) {
      return NextResponse.json({ error: 'delete_failed', message: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[photos DELETE] error', e);
    return NextResponse.json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500 });
  }
}
