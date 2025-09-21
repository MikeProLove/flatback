// app/catalog/products/page.tsx
import React from 'react';
import Card from '@/components/Card';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { getSupabaseServer } from '@/lib/supabase-server';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServer();

  if (!supabase) {
    console.error(
      '[products] Supabase client is not configured. ' +
        'Проверь .env: NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (или серверные ключи).'
    );
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[products] supabase error:', error.message);
    return [];
  }

  return (data as unknown as Product[]) ?? [];
}

export default async function ProductsPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Каталог</h1>
        <div className="rounded-2xl border p-6">
          <p className="mb-2">Доступно только авторизованным пользователям.</p>
          <div className="text-sm">
            <SignInButton mode="redirect" forceRedirectUrl="/catalog/products">
              <span className="underline cursor-pointer">Войти</span>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Каталог</h1>

      {products.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет товаров.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const title = (p as any).name ?? (p as any).title ?? 'Без названия';
            const category = (p as any).category ?? '';
            const imageUrl =
              (p as any).imageUrl ?? (p as any).image_url ?? null;
            const price =
              typeof (p as any).price === 'number'
                ? money((p as any).price as number)
                : (p as any).price ?? '—';
            const city = (p as any).city ?? '';

            return (
              <Card key={(p as any).id}>
                {/* Заголовок */}
                <div className="p-4">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2">
                    {title}
                  </h3>
                  {category ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category}
                    </p>
                  ) : null}
                </div>

                {/* Картинка */}
                {imageUrl ? (
                  <div className="px-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-48 w-full rounded-xl object-cover"
                    />
                  </div>
                ) : null}

                {/* Контент */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">{price}</span>
                    {city ? (
                      <span className="text-sm text-muted-foreground">
                        {city}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Футер под кнопку/линк — если понадобится
                <div className="p-4 pt-0">
                  <Link href={`/catalog/products/${(p as any).id}`} className="underline">
                    Подробнее
                  </Link>
                </div>
                */}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
