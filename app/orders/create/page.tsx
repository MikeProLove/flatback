// app/orders/create/page.tsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import OrderForm from './OrderForm';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { Product, Service } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const supabase = getSupabaseServer();

  let products: Product[] = [];
  let services: Service[] = [];
  let warn = '';

  if (!supabase) {
    warn =
      'Переменные окружения Supabase недоступны во время сборки. Форма отображается без предзагруженных данных.';
  } else {
    try {
      // Товары
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, description, price, category, stock_qty, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (prodErr) throw prodErr;

      products = (prodData ?? []).map((p) => ({
        ...p,
        price: p.price ?? 0,
        stock_qty: p.stock_qty ?? 0,
      })) as Product[];

      // Услуги
      const { data: svcData, error: svcErr } = await supabase
        .from('services')
        .select('id, name, description, price, category, execution_time_minutes, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (svcErr) throw svcErr;

      services = (svcData ?? []).map((s) => ({
        ...s,
        price: s.price ?? 0,
        execution_time_minutes: s.execution_time_minutes ?? 60,
      })) as Service[];
    } catch (e: any) {
      warn = `Не удалось загрузить каталог: ${e?.message ?? e}`;
      products = [];
      services = [];
    }
  }

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">Новый заказ</h1>

      {!!warn && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warn}
        </div>
      )}

      <SignedOut>
        <div className="text-sm">
          Доступно только авторизованным пользователям.{' '}
          <SignInButton mode="redirect" redirectUrl="/orders/create">
            <span className="underline">Войти</span>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <OrderForm products={products} services={services} />
      </SignedIn>
    </main>
  );
}
