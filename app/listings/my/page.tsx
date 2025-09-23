import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import Actions from './Actions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  created_at: string;
  status: string;
  owner_id: string | null;
  user_id: string | null;
};

async function getMine(userId: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from('listings_with_cover')
    .select('id,title,price,city,rooms,area_total,cover_url,created_at,status,owner_id,user_id')
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`) // на случай старых записей
    .order('created_at', { ascending: false })
    .limit(100);

  return (data ?? []) as Row[];
}

export default async function MyListingsPage() {
  const { userId } = auth();
  if (!userId) redirect('/');

  const rows = await getMine(userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Мои объявления</h1>
        <a href="/listings/create" className="px-3 py-2 border rounded-md text-sm">Новое объявление</a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          У вас ещё нет объявлений. <a href="/listings/create" className="underline">Создать</a>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((l) => (
            <div key={l.id} className="rounded-2xl border overflow-hidden">
              <div className="aspect-[4/3] bg-muted">
                {l.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover_url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <a href={`/listings/${l.id}`} className="text-lg font-semibold hover:underline">
                      {l.title ?? 'Объявление'}
                    </a>
                    <div className="text-sm text-muted-foreground">
                      {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                    </div>
                    <div className="text-xs">
                      Статус:{' '}
                      <span className={l.status === 'published' ? 'text-green-600' : 'text-yellow-600'}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-semibold">{(l.price ?? 0).toLocaleString('ru-RU')} ₽</div>
                </div>

                <Actions id={l.id} status={l.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
