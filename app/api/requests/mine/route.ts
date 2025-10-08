// app/api/requests/mine/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Booking = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  monthly_price: number;
  deposit: number | null;
  created_at: string;
  listing_id: string | null;
  renter_id: string; // ты — арендатор
};

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const sb = getSupabaseAdmin();

    // 1) мои заявки как арендатор
    const { data: bookings, error } = await sb
      .from('bookings')
      .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,renter_id')
      .eq('renter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    const listingIds = [...new Set((bookings ?? []).map(b => b.listing_id).filter(Boolean))] as string[];

    // 2) подтянем заголовок/город/владельца
    const { data: listings } = await sb
      .from('listings')
      .select('id,title,city,owner_id,user_id')
      .in('id', listingIds);

    const L = new Map<string, { title: string | null; city: string | null; owner_id: string | null }>();
    (listings ?? []).forEach(x =>
      L.set(x.id, { title: x.title ?? null, city: x.city ?? null, owner_id: (x.owner_id ?? x.user_id) ?? null })
    );

    // 3) обложки
    let covers = new Map<string, string>();
    if (listingIds.length) {
      const { data: photos } = await sb
        .from('listing_photos')
        .select('listing_id,url,sort_order')
        .in('listing_id', listingIds)
        .order('sort_order', { ascending: true });

      (photos ?? []).forEach(p => {
        if (!covers.has(p.listing_id)) covers.set(p.listing_id, p.url || '');
      });
    }

    // 4) уже созданные чаты между владельцем и мной (арендатором)
    const ownerPairs = (listings ?? [])
      .filter(x => x.id && (x.owner_id || x.user_id))
      .map(x => ({ listing_id: x.id, owner_id: (x.owner_id ?? x.user_id)! }));

    const chatMap = new Map<string, string>(); // key: listing_id → chat_id
    if (ownerPairs.length) {
      const { data: chats } = await sb
        .from('chats')
        .select('id,listing_id,owner_id,participant_id')
        .in('listing_id', ownerPairs.map(p => p.listing_id));

      (chats ?? []).forEach(c => {
        // чат между владельцем и текущим юзером
        const own = ownerPairs.find(p => p.listing_id === c.listing_id)?.owner_id;
        if (own && c.owner_id === own && c.participant_id === userId) {
          chatMap.set(c.listing_id, c.id);
        }
      });
    }

    const rows = (bookings ?? []).map(b => {
      const meta = b.listing_id ? L.get(b.listing_id) : undefined;
      return {
        id: b.id,
        status: b.status,
        payment_status: b.payment_status,
        start_date: b.start_date,
        end_date: b.end_date,
        monthly_price: b.monthly_price,
        deposit: b.deposit,
        created_at: b.created_at,
        listing_id: b.listing_id,
        listing_title: b.listing_id ? meta?.title ?? null : null,
        listing_city: b.listing_id ? meta?.city ?? null : null,
        cover_url: b.listing_id ? (covers.get(b.listing_id) || null) : null,
        owner_id_for_chat: b.listing_id ? meta?.owner_id ?? null : null,
        chat_id: b.listing_id ? (chatMap.get(b.listing_id!) || null) : null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'internal' }, { status: 500 });
  }
}
