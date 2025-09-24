// app/api/requests/my/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const isUuid = (v: any): v is string =>
  typeof v === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // Заявки арендатора (без вложенных таблиц)
    const { data: br, error } = await sb
      .from('booking_requests')
      .select(
        'id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,owner_id'
      )
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const base = (br ?? []).map((r: any) => ({
      id: r.id as string,
      status: r.status as 'pending' | 'approved' | 'declined' | 'cancelled',
      payment_status: (r.payment_status ?? 'pending') as 'pending' | 'paid' | 'refunded',
      start_date: r.start_date ?? null,
      end_date: r.end_date ?? null,
      monthly_price: Number(r.monthly_price ?? 0),
      deposit: Number(r.deposit ?? 0),
      created_at: r.created_at as string,
      listing_id: r.listing_id ?? null,
      owner_id: r.owner_id ?? null,
      listing_title: null as string | null,
      listing_city: null as string | null,
      cover_url: null as string | null,
    }));

    // Подтягиваем мета объявлений только для валидных UUID
    const ids = Array.from(new Set(base.map((r) => r.listing_id).filter(isUuid)));
    let coverMap = new Map<string, { title: string | null; city: string | null; cover_url: string | null }>();

    if (ids.length) {
      const { data: lst } = await sb
        .from('listings_with_cover')
        .select('id,title,city,cover_url')
        .in('id', ids);

      coverMap = new Map(
        (lst ?? []).map((it: any) => [
          String(it.id),
          { title: it.title ?? null, city: it.city ?? null, cover_url: it.cover_url ?? null },
        ])
      );
    }

    const rows = base.map((r) => {
      const m = isUuid(r.listing_id) ? coverMap.get(r.listing_id) : null;
      return {
        ...r,
        listing_title: m?.title ?? null,
        listing_city: m?.city ?? null,
        cover_url: m?.cover_url ?? null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error('[requests/my] GET', e);
    return NextResponse.json(
      { error: 'server_error', message: e?.message ?? 'Internal' },
      { status: 500 }
    );
  }
}
