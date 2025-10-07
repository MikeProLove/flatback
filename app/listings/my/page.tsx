// app/listings/my/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import PublishButtons from '../_components/PublishButtons';
import Link from 'next/link';

type Row = {
  id: string;
  title: string | null;
  status: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  owner_id: string | null;
  user_id: string | null;
  created_at: string;
};

function money(n?: number | null) {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} ₽`;
  }
}

export default async function MyListingsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const sb = getSupabaseAdmin();

  // 1) Берём объявления пользователя из вьюхи с cover_url
  const { data } = await sb
    .from('listings_with_cover')
    .select(
      'id,title,status,price,city,rooms,area_total,cover_url,owner_id,user_id,created_at'
    )
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as Row[];

  // 2) Fallback: если cover_url пуст, достаём первую фотку из storage
  const fallback = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => !r.cover_url)
      .map(async (r) => {
        const owner = r.owner_id || r.user_id;
        if (!owner) return;
        const prefix = `${owner}/${r.id}`;
        const list = await sb.storage.from('listings').list(prefix, { limit: 1 });
        const first = list?.data?.[0];
        if (first) {
          const path = `${prefix}/${first.name}`;
          const pub = sb.storage.from('listings').getPublicUrl(path);
          fallback.set(r.id, pub.data.publicUrl);
        }
      })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Мои объявления</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          У вас пока нет объявлений.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const cover = r.cover_url || fallback.get(r.id) || '';
            return (
              <div key={r.id} className="rounded-2xl border overflow-hidden">
                <a href={`/listings/${r.id}`} className="block">
                  <div className="aspect-[4/3] bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                </a>

                <div className="p-4 space-y-2">
                  <div className="text-base font-semibold">{r.title ?? 'Объявление'}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.city ?? '—'} · {r.rooms ?? '—'}к · {r.area_total ?? '—'} м²
                  </div>
                  <div className="text-sm font-semibold">{money(r.price)}</div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-xs">
                      Статус:{' '}
                      <span
                        className={
                          r.status === 'published' ? 'text-green-600' : 'text-yellow-700'
                        }
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {/* Кнопки публикации/снятия */}
                      <PublishButtons id={r.id} status={r.status ?? undefined} />

                      {/* Ссылка на редактирование */}
                      <Link
                        href={`/listings/${r.id}/edit`}
                        className="px-3 py-1 border rounded-md text-sm hover:bg-muted"
                      >
                        Редактировать
                      </Link>
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

