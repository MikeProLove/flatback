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

  // 👇 Узкое место: getSupabaseServer может вернуть null — обработаем это явно
  if (!supabase) {
    console.error(
      '[products] Supabase client is not configured. ' +
        'Проверь .env: NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (или серверные ключи) '
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
          {products.map((p) => (
            <Card key={p.id}>
              <Card.Header>
                <Card.Title className="line-clamp-2">
                  {p.name ?? p.title ?? 'Без названия'}
                </Card.Title>
                <Card.Description>{p.category ?? ''}</Card.Description>
              </Card.Header>

              {p.imageUrl ? (
                <Card.Media>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.name ?? p.title ?? 'product'}
                    className="h-48 w-full rounded-xl object-cover"
                  />
                </Card.Media>
              ) : null}

              <Card.Content>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium">
                    {typeof p.price === 'number' ? money(p.price) : p.price ?? '—'}
                  </span>
                  {p.city ? (
                    <span className="text-sm text-muted-foreground">{p.city}</span>
                  ) : null}
                </div>
              </Card.Content>
              {/* <Card.Footer>
                <Link href={`/catalog/products/${p.id}`} className="underline">
                  Подробнее
                </Link>
              </Card.Footer> */}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
