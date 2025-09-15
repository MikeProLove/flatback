// app/orders/create/page.tsx
import { SignedIn, SignedOut } from '@clerk/nextjs';
import OrderForm from './OrderForm';
import { money } from '@/lib/money';

export const dynamic = 'force-dynamic';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;        // NUMERIC приходит строкой -> приводим дальше
  category: string | null;
  stock_qty: number | null;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;        // NUMERIC
  category: string | null;
  execution_time_minutes: number | null;
};

export default async function Page() {
  const { getSupabaseServer } = await import('@/lib/supabase-server');
  const supabase = getSupabaseServer();

  let products: Product[] = [];
  let services: Service[] = [];
  let warn = '';

  if (supabase) {
    try {
      // товары
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, description, price, category, stock_qty')
        .order('name', { ascending: true });

      if (prodErr) throw prodErr;
      products = (prodData ?? []).map((p) => ({
        ...p,
        price: p.price === null ? null : Number(p.price),
      }));

      // услуги
      const { data: svcData, error: svcErr } = await supabase
        .from('services')
        .select('id, name, description, price, category, execution_time_minutes')
        .order('name', { ascending: true });

      if (svcErr) throw svcErr;
      services = (svcData ?? []).map((s) => ({
        ...s,
        price: s.price === null ? null : Number(s.price),
      }));
    } catch {
      warn =
        'Не удалось предзагрузить данные с сервера. Форма всё равно работает и подгрузит данные из браузера.';
    }
  } else {
    warn =
      'Переменные окружения Supabase недоступны во время сборки. Форма отображается без предзагруженных данных.';
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {warn && (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warn}
        </div>
      )}

      <h1 className="text-2xl font-semibold">Новый заказ</h1>

      <SignedOut>
        <p className="text-gray-600">Войдите, чтобы создать заказ.</p>
      </SignedOut>

      <SignedIn>
        <OrderForm products={products} services={services} />
      </SignedIn>
    </main>
  );
}
