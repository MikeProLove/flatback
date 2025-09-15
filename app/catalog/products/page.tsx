// app/catalog/products/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Card from '@/components/Card';
import { listProducts } from '@/lib/actions/catalog';
import { money } from '@/lib/format';

export default async function Page() {
  const products = await listProducts();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Каталог — Товары</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} title={p.name}>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>{p.category ?? '—'}</span>
              <span>На складе: {p.stock_qty ?? 0}</span>
            </div>
            <div className="text-gray-500">{p.description ?? 'Без описания'}</div>
            <div className="mt-2 font-semibold">{money(p.price)}</div>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="text-sm text-gray-500">
            Нет данных (на этапе билда или пустая таблица).
          </div>
        )}
      </div>
    </div>
  );
}
// app/catalog/products/page.tsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { listProducts } from '@/lib/actions/catalog';
import { money } from '@/lib/format';
import Card from '@/components/Card';

export const revalidate = 30; // ISR, чтобы не долбить базу

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Товары</h1>

      <SignedOut>
        <Card title="Доступ ограничен">
          <p className="text-sm text-gray-600">
            Войдите, чтобы просматривать каталог. <SignInButton />
          </p>
        </Card>
      </SignedOut>

      <SignedIn>
        {products.length === 0 ? (
          <Card title="Пусто">В каталоге пока нет активных товаров.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} title={p.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{p.category ?? '—'}</span>
                  <span>На складе: {p.stock_qty}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{p.description ?? 'Без описания'}</span>
                </div>
                <div className="mt-2 font-semibold">{money(p.price)}</div>
              </Card>
            ))}
          </div>
        )}
      </SignedIn>
    </main>
  );
}
