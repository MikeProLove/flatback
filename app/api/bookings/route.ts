import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ message: 'not_authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const listingId: string | undefined = body?.listingId;
    const startDate: string | null = body?.startDate || null;
    const endDate: string | null = body?.endDate || null;

    if (!listingId) {
      return NextResponse.json({ message: 'listing_id_required' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // подтянем цену/залог/владельца, чтобы сохранить в заявке
    const { data: listing, error: lerr } = await sb
      .from('listings')
      .select('id, owner_id, user_id, price, deposit')
      .eq('id', listingId)
      .single();

    if (lerr || !listing) {
      return NextResponse.json({ message: 'listing_not_found' }, { status: 404 });
    }

    const { data, error } = await sb
      .from('bookings') // именно ТАБЛИЦА, не view
      .insert([
        {
          listing_id: listing.id,
          user_id: userId, // Clerk id (text), ваши SQL-хелперы уже учитывают text
          status: 'pending',
          payment_status: 'pending',
          start_date: startDate,
          end_date: endDate,
          monthly_price: listing.price ?? null,
          deposit: listing.deposit ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message || 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'server_error' }, { status: 500 });
  }
}
