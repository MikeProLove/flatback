// app/catalog/products/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Card from '@/components/Card';
import { listProducts } from '@/lib/actions/catalog';
import { money } from '@/lib/format';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default async function Page() {
  const products = await listProducts();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Каталог — Товары</h1>

      <SignedOut>
        <div className="rounded border p-4">
          <div className="mb-2">Чтобы увидеть список товаров, войдите в систему.</div>
          <SignInButton />
        </div>
      </SignedOut>

      <SignedIn>
        {products.length === 0 ? (
          <div className="text-sm text-gray-500">
            Нет данных (на этапе билда или пустая таблица).
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} title={p.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{p.category ?? '—'}</span>
                  <span>На складе: {p.stock_qty ?? 0}</span>
                </div>
                <div className="text-gray-500">
                  {p.description ?? 'Без описания'}
                </div>
                <div className="mt-2 font-semibold">{money(p.price)}</div>
              </Card>
            ))}
          </div>
        )}
      </SignedIn>
    </div>
  );
}
