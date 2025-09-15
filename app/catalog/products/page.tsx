// app/catalog/products/page.tsx
export const dynamic = 'force-dynamic';

import Card from '@/components/Card';
import { money } from '@/lib/format';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { fetchProducts, type ProductRow } from '@/lib/actions/catalog';

export default async function ProductsPage() {
  // сервером грузим из Supabase через server-only action
  const products: ProductRow[] = await fetchProducts();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Каталог — Товары</h1>

      <SignedOut>
        <div className="rounded-md border p-4 text-sm">
          Для просмотра каталога войдите.{' '}
          <SignInButton mode="modal">
            <button className="underline">Войти</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {!products?.length ? (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            Нет данных (на этапе билда или пустая таблица).
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} title={p.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{p.category ?? '—'}</span>
                  <span>На складе: {p.stock_qty ?? 0}</span>
                </div>
                <div className="text-gray-500">{p.description ?? 'Без описания'}</div>
                <div className="mt-2 font-semibold">{money(p.price ?? 0)}</div>
              </Card>
            ))}
          </div>
        )}
      </SignedIn>
    </main>
  );
}
