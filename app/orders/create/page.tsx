// app/orders/create/page.tsx

// Не даём Next.js пытаться пререндерить страницу на билде
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Новый заказ',
};

type Product = {
  id: string;
  name: string;
  price_cents?: number;
  price?: number;
  is_active?: boolean;
  [k: string]: unknown;
};

type Service = {
  id: string;
  name: string;
  price_cents?: number;
  price?: number;
  is_active?: boolean;
  [k: string]: unknown;
};

export default async function Page() {
  // Импортируем supabase-клиент только здесь, а не на уровне модуля
  const { getSafeSupabase } = await import('@/lib/supabase');
  const supabase = getSafeSupabase();

  let products: Product[] = [];
  let services: Service[] = [];

  if (supabase) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('products').select('*').eq('available', true),
      supabase.from('services').select('*'),
    ]);
    products = (p ?? []) as Product[];
    services = (s ?? []) as Service[];
  }

  // Динамически импортируем форму (избегаем проблем с клиентскими компонентами)
  const OrderForm = (await import('./OrderForm')).default;

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Новый заказ</h1>

      {!supabase && (
        <div className="mb-4 rounded border p-3 text-sm">
          Переменные окружения Supabase недоступны во время сборки. Форма
          отображается без предзагруженных данных.
        </div>
      )}

      <OrderForm products={products} services={services} />
    </div>
  );
}
