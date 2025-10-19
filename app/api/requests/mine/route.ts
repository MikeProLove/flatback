export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function tryFetchMine(sb: any, userId: string) {
  // последовательные попытки подобрать колонку «кто подал заявку»
  const candidates = ['renter_id', 'user_id', 'created_by', 'applicant_id'];
  for (const col of candidates) {
    const q = sb
      .from('bookings')
      .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id')
      .eq(col, userId)
      .order('created_at', { ascending: false });
    const r = await q;
    if (!r.error) return r.data ?? [];
  }
  // если ни одна колонка не подошла — берём те, где есть chat + участник
  const alt = await sb
    .from('bookings')
    .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,chat_id')
    .order('created_at', { ascending: false });
  if (alt.error) throw alt.error;
  return alt.data ?? [];
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const sb = getSupabaseAdmin();

  try {
    const bookings = await tryFetchMine(sb, userId);

    // подтягиваем информацию об объявлении и владельце
    const listingIds = Array.from(new Set((bookings ?? []).map((b: any) => b.listing_id).filter(Boolean)));
    let meta = new Map<string, { title: string | null; city: string | null; owner_id: string | null }>();
    if (listingIds.length) {
      const { data: L } = await sb
        .from('listings')
        .select('id,title,city,owner_id,user_id')
        .in('id', listingIds);
      (L ?? []).forEach((x: any) => {
        meta.set(x.id, { title: x.title, city: x.city, owner_id: x.owner_id || x.user_id || null });
      });
    }

    // обложки
    let covers = new Map<string, string>();
    if (listingIds.length) {
      const { data: ph } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });
      (ph ?? []).forEach((p: any) => { if (!covers.has(p.listing_id) && p.url) covers.set(p.listing_id, p.url); });
    }

    // чаты по этим объявам, где пользователь — участник
    let byListingChat = new Map<string, string>();
    if (listingIds.length) {
      const { data: ch } = await sb
        .from('chats')
        .select('id,listing_id,owner_id,participant_id')
        .in('listing_id', listingIds);
      (ch ?? []).forEach((c: any) => {
        if (c.owner_id === userId || c.participant_id === userId) {
          byListingChat.set(c.listing_id, c.id);
        }
      });
    }

    const rows = (bookings ?? []).map((b: any) => {
      const m = meta.get(b.listing_id) || { title: null, city: null, owner_id: null };
      return {
        ...b,
        listing_title: m.title,
        listing_city: m.city,
        cover_url: covers.get(b.listing_id) || null,
        chat_id: b.chat_id || byListingChat.get(b.listing_id) || null,
        owner_id_for_chat: m.owner_id,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'load_failed' }, { status: 500 });
  }
}
