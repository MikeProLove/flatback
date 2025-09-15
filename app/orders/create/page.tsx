// app/orders/create/page.tsx
import { SignedIn, SignedOut } from '@clerk/nextjs';
import OrderForm from './OrderForm';
import { money } from '@/lib/money';

// ВАЖНО: эта страница всегда рендерится на запрос (никакого пререндеринга на билде)
export const dynamic = 'force-dynamic';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number; // в БД numeric -> мы приведём к number
  category: string | null;
  stock_qty: number;
  is_active: boolean;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number; // numeric -> number
  category: string | null;
  execution_time_minutes: number | null;
  is_active: boolean;
};

export default async function Page() {
  // Импортируем клиент только тут (чтобы не выполнялось на этапе билда бандлером)
  const { getSupabaseServer } = await import('@/lib/supabase');
  const supabase = getSupabaseServer();

  let products: Product[] = [];
  let services: Service[] = [];
  let banner: string | null = null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Переменные отсутствуют — не падаем, просто показываем пустую форму
    banner =
      'Переменные окружения Supabase недоступны. Форма отображается без предзагруженных данных.';
  } else {
    // Нормальный серверный запрос на РАНТАЙМЕ
    const [{ data: pData, error: pErr }, { data: sData, error: sErr }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true }),
      supabase.from('services').select('*').eq('is_active', true).order('name', { ascending: true }),
    ]);

    if (pErr || sErr) {
      banner = 'Не удалось загрузить каталог. Попробуйте обновить страницу.';
    } else {
      // numeric -> number
      products =
        (pData ?? []).map((p: any) => ({
          ...p,
          price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        })) as Product[];

      services =
        (sData ?? []).map((s: any) => ({
          ...s,
          price: typeof s.price === 'string' ? parseFloat(s.price) : s.price,
        })) as Service[];
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Новый заказ</h1>

      {banner && (
        <div className="mb-6 rounded-md border p-4 text-sm text-gray-700 bg-yellow-50 border-yellow-200">
          {banner}
        </div>
      )}

      <SignedOut>
        <p>Войдите, чтобы создать заказ.</p>
      </SignedOut>

      <SignedIn>
        <OrderForm products={products} services={services} />
      </SignedIn>
    </main>
  );
}
