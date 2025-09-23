import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Actions from './Actions';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_price: number | null;
  deposit: number | null;
  listing_id: string;
  tenant_id: string;
  created_at: string;
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;
};

async function getIncoming(ownerId: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('booking_requests')
    .select('id,status,start_date,end_date,monthly_price,deposit,created_at,tenant_id,listing_id, listings:listing_id(title,city)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    monthly_price: r.monthly_price,
    deposit: r.deposit,
    listing_id: r.listing_id,
    tenant_id: r.tenant_id,
    created_at: r.created_at,
    listing_title: r.listings?.title ?? null,
    listing_city: r.listings?.city ?? null,
  })) as Row[];

  // обложки
  const ids = rows.map((r) => r.listing_id);
  const covers = new Map<string, string>();
  if (ids.length) {
    const { data: cov } = await sb
      .from('listings_with_cover')
      .select('id,cover_url')
      .in('id', ids);
    for (const c of (cov ?? []) as any[]) {
      if (c.cover_url) covers.set(c.id, c.cover_url);
    }
  }
  return rows.map((r) => ({ ...r, cover_url: covers.get(r.listing_id) ?? null }));
}

export default async function OwnerRequestsPage() {
  const { userId } = auth();
  if (!userId) redirect('/');

  const rows = await getIncoming(userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Заявки на мои объявления</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет заявок.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border overflow-hidden">
              <div className="grid grid-cols-[160px_1fr] gap-0">
                <div className="bg-muted">
                  {r.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <a href={`/listings/${r.listing_id}`} className="font-medium hover:underline">
                        {r.listing_title ?? 'Объявление'}
                      </a>
                      <div className="text-sm text-muted-foreground">{r.listing_city ?? '—'}</div>
                      <div className="text-xs">
                        {new Date(r.start_date).toLocaleDateString('ru-RU')} — {new Date(r.end_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{money(Number(r.monthly_price) || 0)} / мес</div>
                      {r.deposit ? <div className="text-muted-foreground">Залог: {money(Number(r.deposit))}</div> : null}
                      <div className={`text-xs ${r.status === 'approved' ? 'text-green-600' : r.status === 'declined' ? 'text-red-600' : r.status === 'cancelled' ? 'text-gray-500' : 'text-yellow-600'}`}>
                        {r.status}
                      </div>
                    </div>
                  </div>

                  {r.status === 'pending' ? (
                    <div className="pt-2">
                      <Actions id={r.id} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
