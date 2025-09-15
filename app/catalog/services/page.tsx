// app/catalog/services/page.tsx
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { listServices } from '@/lib/actions/catalog';
import { money } from '@/lib/format';
import Card from '@/components/Card';

export const revalidate = 30;

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Услуги</h1>

      <SignedOut>
        <Card title="Доступ ограничен">
          <p className="text-sm text-gray-600">
            Войдите, чтобы просматривать каталог. <SignInButton />
          </p>
        </Card>
      </SignedOut>

      <SignedIn>
        {services.length === 0 ? (
          <Card title="Пусто">В каталоге пока нет услуг.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </main>
  );
}
