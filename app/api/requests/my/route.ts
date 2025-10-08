// app/api/requests/my/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function detectRenterColumn(sb: ReturnType<typeof getSupabaseAdmin>) {
  // читаем список колонок у таблицы bookings
  const { data, error } = await sb
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'bookings');

  if (error) return null;
  const names = new Set((data ?? []).map((r: any) => r.column_name as string));
  // популярные варианты имен
  const candidates = [
    'renter_id',
    'user_id',
    'created_by',
    'created_by_user_id',
    'author_id',
    'applicant_id',
    'client_id',
  ];
  for (const c of candidates) if (names.has(c)) return c;
  return null;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // 1) определяем колонку арендатора
  const renterCol = await detectRenterColumn(sb);

  // 2) вытаскиваем заявки пользователя
  let bookingsRes:
    | { data: any[] | null; error: any | null }
    | { data: any[]; error: null } = { data: [], error: null };

  if (renterCol) {
    bookingsRes = await sb
      .from('bookings')
      .select('*')
      .eq(renterCol, userId)
      .order('created_at', { ascending: false });
  } else {
    // Fallback: нет явной колонки арендатора → берём чаты, где я участник, и по ним заявки
    const c = await sb.from('chats').select('listing_id').eq('participant_id', userId);
    if (!c.error && c.data?.length) {
      const listingIds = (c.data as any[]).map((x) => x.listing_id).filter(Boolean);
      bookingsRes = await sb
        .from('bookings')
        .select('*')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });
    } else {
      bookingsRes = { data: [], error: null };
    }
  }

  if ((bookingsRes as any).error) {
    const er = (bookingsRes as any).error;
    return NextResponse.json({ error: 'db_error', message: er.message || String(er) }, { status: 500 });
  }
  const rows = (bookingsRes.data ?? []) as any[];

  // 3) подтянем инфо по объявлениям
  const listingIds: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const lid = rows[i]?.listing_id as string | null;
    if (lid && listingIds.indexOf(lid) === -1) listingIds.push(lid);
  }

  const listingMap: Record<string, { id: string; owner_id: string | null; user_id: string | null; title: string | null; city: string | null }> =
    {};
  if (listingIds.length) {
    const L = await sb.from('listings').select('id, owner_id, user_id, title, city').in('id', listingIds);
    if (!L.error) {
      for (const l of (L.data ?? []) as any[]) {
        listingMap[l.id] = {
          id: l.id,
          owner_id: l.owner_id ?? null,
          user_id: l.user_id ?? null,
          title: l.title ?? null,
          city: l.city ?? null,
        };
      }
    }
  }

  // 4) обложки
  const covers: Record<string, string> = {};
  if (listingIds.length) {
    const P = await sb
      .from('listing_photos')
      .select('listing_id, url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true });
    if (!P.error) {
      for (const p of (P.data ?? []) as any[]) {
        const lid = p.listing_id as string;
        if (covers[lid] === undefined && p.url) covers[lid] = p.url as string;
      }
    }
  }

  // 5) ответ
  const out = rows.map((r) => {
    const l = r.listing_id ? listingMap[r.listing_id] : null;
    const ownerForChat = l ? (l.owner_id || l.user_id) : null;
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      payment_status: r.payment_status,
      start_date: r.start_date,
      end_date: r.end_date,
      monthly_price: r.monthly_price ?? r.price ?? 0,
      deposit: r.deposit ?? null,
      listing_id: r.listing_id ?? null,
      listing_title: l ? l.title : null,
      listing_city: l ? l.city : null,
      cover_url: r.listing_id ? (covers[r.listing_id] ?? null) : null,
      owner_id_for_chat: ownerForChat,
    };
  });

  return NextResponse.json({ rows: out });
}
