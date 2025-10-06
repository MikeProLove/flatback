// app/listings/my/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import PublishButtons from '../_components/PublishButtons';

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
  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Мои объявления</h1>
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Войдите, чтобы увидеть свои объявления.
        </div>
      </div>
    );
  }

  const sb = getSupabaseAdmin();

  // Берём из вьюхи, где уже есть cover_url. Если её нет — можно заменить на 'listings'
  const q = sb
    .from('listings_with_cover')
    .select(
      'id,title,price,city,rooms,area_total,cover_url,status,created_at,owner_id,user_id'
    )
    .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200);

  const { data, error } = await q;

  const rows =
    (data as Array<{
      id: string;
      title: string | null;
      price: number | null;
      city: string | null;
      rooms: number | null;
      area_total: number | null;
      cover_url: string | null;
      status: string | null;
      created_at: string;
    }>) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Мои объявления</h1>

      {error ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">
          Ошибка загрузки списка.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет объявлений.{' '}
          <a href="/listings/create" className="underline">
            Создать объявление
          </a>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((l) => (
            <div
              key={l.id}
              className="rounded-2xl border overflow-hidden hover:shadow transition"
            >
              <a href={`/listings/${l.id}`} className="block">
                <div className="aspect-[4/3] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.cover_url ? (
                    <img
                      src={l.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </a>

              <div className="p-4 space-y-2">
                <a
                  href={`/listings/${l.id}`}
                  className="text-lg font-semibold hover:underline line-clamp-1"
                >
                  {l.title ?? 'Объявление'}
                </a>
                <div className="text-sm text-muted-foreground">
                  {l.city ?? '—'} · {l.rooms ?? '—'}к · {l.area_total ?? '—'} м²
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">
                    {money(l.price)}
                  </div>
                  <PublishButtons id={l.id} status={l.status ?? undefined} />
                </div>

                <div className="text-xs">
                  Статус:{' '}
                  <span
                    className={
                      (l.status ?? '') === 'published'
                        ? 'text-green-600'
                        : 'text-yellow-700'
                    }
                  >
                    {l.status ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
