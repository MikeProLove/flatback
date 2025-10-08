// app/api/chats/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('chats')
    .select(`id, listing_id, owner_id, participant_id, listing:listings(id,title,city)`)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // проверим, что ты участник чата
  if (data.owner_id !== userId && data.participant_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ chat: data });
}
