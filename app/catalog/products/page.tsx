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
