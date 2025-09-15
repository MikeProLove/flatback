// app/catalog/services/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Card from '@/components/Card';
import { listServices } from '@/lib/actions/catalog';
import { money } from '@/lib/format';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default async function Page() {
  const services = await listServices();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Каталог — Услуги</h1>

      <SignedOut>
        <div className="rounded border p-4">
          <div className="mb-2">Чтобы увидеть список услуг, войдите в систему.</div>
          <SignInButton />
        </div>
      </SignedOut>

      <SignedIn>
        {services.length === 0 ? (
          <div className="text-sm text-gray-500">
            Нет данных (на этапе билда или пустая таблица).
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card key={s.id} title={s.name}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{s.category ?? '—'}</span>
                  <span>{s.execution_time_minutes ?? 60} мин</span>
                </div>
                <div className="text-gray-500">{s.description ?? 'Без описания'}</div>
                <div className="mt-2 font-semibold">{money(s.price)}</div>
              </Card>
            ))}
          </div>
        )}
      </SignedIn>
    </div>
  );
}
