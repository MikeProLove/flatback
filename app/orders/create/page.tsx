// app/orders/create/page.tsx
import { SignedIn, SignedOut } from '@clerk/nextjs';
import OrderForm from './OrderForm';

// Гарантируем серверный рендер на каждый запрос и без кэша
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;        // в БД NUMERIC -> supabase-js вернёт string, ниже приведём к number
  category: string | null;
  stock_qty: number | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  execution_time_minutes: number | null;
};

function parseMoney(n: unknown): number | null {
  if (n == null) return null;
  if (typeof n === 'number') return n;
  if (typeof n === 'string') {
    const x = Number(n);
    return Number.isFinite(x) ? x : null;
  }
  return null;
}

export default async function Page() {
  // Импорт supabase делаем динамическим, чтобы не тащить env на билде
  const { getSafeSupabase } = await import('@/lib/supabase');
  const supabase = getSafeSupabase();

  let products: Product[] = [];
  let services: Service[] = [];
  let banner: string | null = null;

  try {
    // Загрузка товаров
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('id, name, description, price, category, stock_qty')
      .order('name', { ascending: true });

    if (prodErr) throw prodErr;

    products =
      (prodData ?? []).map((p: any) => ({
        ...p,
        price: parseMoney(p.price),
      })) as Product[];
  } catch (e: any) {
    console.error('Load products failed:', e);
    banner = 'Не удалось загрузить товары (см. server logs). Форма доступна, но без предзагрузки.';
    products = [];
  }

  try {
    // Загрузка услуг
    const { data: svcData, error: svcErr } = await supabase
      .from('services')
      .select('id, name, description, price, category, execution_time_minutes')
      .order('name', { ascending: true });

    if (svcErr) throw svcErr;

    services =
      (svcData ?? []).map((s: any) => ({
        ...s,
        price: parseMoney(s.price),
      })) as Service[];
  } catch (e: any) {
    console.error('Load services failed:', e);
    banner = banner ?? 'Не удалось загрузить услуги (см. server logs). Форма доступна, но без предзагрузки.';
    services = [];
  }

  // Если на билде не было ENV, мы тоже покажем понятный баннер
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    banner =
      'Переменные окружения Supabase недоступны во время сборки. Форма отображается без предзагруженных данных.';
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <SignedOut>
        <div className="text-gray-600">Чтобы создать заказ — войдите.</div>
      </SignedOut>

      <SignedIn>
        {banner && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
            {banner}
          </div>
        )}

        <OrderForm products={products} services={services} />
      </SignedIn>
    </main>
  );
}
