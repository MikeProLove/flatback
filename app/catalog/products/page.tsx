// app/catalog/products/page.tsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Card from '@/components/Card';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductsPage() {
  const supabase = getSupabaseServer();

  let products: Product[] = [];
  let warn = '';

  if (!supabase) {
    warn =
      'Переменные окружения Supabase недоступны во время сборки. Страница рендерится без предзагруженных данных.';
  } else {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, category, stock_qty, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      warn = `Не удалось загрузить товары: ${error.message}`;
    } else {
      products =
        (data ?? []).map((p) => ({
          ...p,
          // страховка от null в числовых полях
          price: p.price ?? 0,
          stock_qty: p.stock_qty ?? 0,
        })) as Product[];
    }
  }

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">Каталог — Товары</h1>

      {!!warn && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warn}
        </div>
      )}

      <SignedOut>
        <div className="text-sm">
          Доступно только авторизованным пользователям.{' '}
          <SignInButton mode="redirect" redirectUrl="/catalog/products">
            <span className="underline">Войти</span>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {products.length === 0 ? (
          <div className="text-gray-500">Нет данных (пустая таблица или ошибка загрузки).</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} title={p.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{p.category ?? '—'}</span>
                  <span>На складе: {p.stock_qty}</span>
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
