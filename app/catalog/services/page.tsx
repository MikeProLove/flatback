// app/catalog/services/page.tsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Card from '@/components/Card';
import { money } from '@/lib/format';
import type { Service } from '@/lib/types';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ServicesPage() {
  const supabase = getSupabaseServer();

  let services: Service[] = [];
  let warn = '';

  if (!supabase) {
    warn =
      'Переменные окружения Supabase недоступны во время сборки. Страница рендерится без предзагруженных данных.';
  } else {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, price, category, execution_time_minutes, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      warn = `Не удалось загрузить услуги: ${error.message}`;
    } else {
      services =
        (data ?? []).map((s) => ({
          ...s,
          price: s.price ?? 0,
          execution_time_minutes: s.execution_time_minutes ?? 60,
        })) as Service[];
    }
  }

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-6">Каталог — Услуги</h1>

      {!!warn && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warn}
        </div>
      )}

      <SignedOut>
        <div className="text-sm">
          Доступно только авторизованным пользователям.{' '}
          <SignInButton mode="redirect" redirectUrl="/catalog/services">
            <span className="underline">Войти</span>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {services.length === 0 ? (
          <div className="text-gray-500">Нет данных (пустая таблица или ошибка загрузки).</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id} title={s.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{s.category ?? '—'}</span>
                  <span>{s.execution_time_minutes ?? 60} мин</span>
                </div>
                <div className="text-gray-500">{s.description ?? 'Без описания'}</div>
                <div className="mt-2 font-semibold">{money(s.price ?? 0)}</div>
              </Card>
            ))}
          </div>
        )}
      </SignedIn>
    </main>
  );
}
