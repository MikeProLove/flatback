import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded' | null;
  start_date: string;
  end_date: string;
  monthly_price: number | null;
  deposit: number | null;
  created_at: string;
  listing_id: string;
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;
  owner_id: string;
};

async function getMy(userId: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('booking_requests')
    .select('id,status,payment_status,start_date,end_date,monthly_price,deposit,created_at,listing_id,owner_id, listings:listing_id(title,city)')
    .eq('tenant_id', userId)
    .order('created_at', { ascending: false });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    payment_status: r.payment_status ?? 'pending',
    start_date: r.start_date,
    end_date: r.end_date,
    monthly_price: r.monthly_price,
    deposit: r.deposit,
    created_at: r.created_at,
    listing_id: r.listing_id,
    listing_title: r.listings?.title ?? null,
    listing_city: r.listings?.city ?? null,
    owner_id: r.owner_id as string,
  })) as Row[];

  // подтянем обложки
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

export default async function RequestsPage() {
  const { userId } = auth();
  if (!userId) redirect('/');

  const rows = await getMy(userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Мои заявки</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          У вас пока нет заявок.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const canPay = r.status === 'approved' && r.payment_status !== 'paid';
            const total = (Number(r.monthly_price) || 0) + (Number(r.deposit) || 0);
            return (
              <div key={r.id} className="rounded-2xl border overflow-hidden">
                <div className="grid grid-cols-[160px_1fr] gap-0">
                  <div className="bg-muted">
                    {r.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-4 space-y-2">
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
                        <div className="text-xs">
                          <span className={
                            r.status === 'approved' ? 'text-green-600' :
                            r.status === 'declined' ? 'text-red-600' :
                            r.status === 'cancelled' ? 'text-gray-500' : 'text-yellow-600'
                          }>
                            {r.status}
                          </span>
                          {' · '}
                          <span className={
                            r.payment_status === 'paid' ? 'text-green-600' :
                            r.payment_status === 'refunded' ? 'text-gray-600' : 'text-yellow-600'
                          }>
                            {r.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Кнопки */}
                    <div className="pt-2 flex gap-8 items-center">
                      {r.status === 'pending' ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/bookings/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'cancel' }),
                            });
                            if (res.ok) location.reload();
                            else alert('Не удалось отменить');
                          }}
                          className="px-3 py-1 border rounded-md text-sm"
                        >
                          Отменить
                        </button>
                      ) : null}

                      {canPay ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/bookings/${r.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'pay', method: 'card' }), // mock-оплата картой
                            });
                            if (res.ok) location.reload();
                            else alert('Оплата не прошла');
                          }}
                          className="px-4 py-2 border rounded-md text-sm"
                        >
                          Оплатить {money(total)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
