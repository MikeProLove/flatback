// app/catalog/services/page.tsx
import React from 'react';
import Card from '@/components/Card';
import { money } from '@/lib/format';
import { getSupabaseServer } from '@/lib/supabase-server';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

// Локальный тип, чтобы не зависеть от '@/lib/types'
type ServiceRow = {
  id: string | number;
  name?: string;
  title?: string;
  category?: string;
  imageUrl?: string;
  image_url?: string;
  price?: number | string | null;
  city?: string | null;
  created_at?: string;
};

async function getServices(): Promise<ServiceRow[]> {
  const supabase = getSupabaseServer();

  if (!supabase) {
    console.error(
      '[services] Supabase client is not configured. ' +
        'Проверь .env: NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (или серверные ключи).'
    );
    return [];
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[services] supabase error:', error.message);
    return [];
  }

  return (data as unknown as ServiceRow[]) ?? [];
}

export default async function ServicesPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Услуги</h1>
        <div className="rounded-2xl border p-6">
          <p className="mb-2">Доступно только авторизованным пользователям.</p>
          <div className="text-sm">
            <SignInButton mode="redirect" forceRedirectUrl="/catalog/services">
              <span className="underline cursor-pointer">Войти</span>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  const services = await getServices();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Услуги</h1>

      {services.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока нет услуг.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const title = s.name ?? s.title ?? 'Без названия';
            const category = s.category ?? '';
            const imageUrl = s.imageUrl ?? s.image_url ?? '';
            const price =
              typeof s.price === 'number' ? money(s.price) : s.price ?? '—';
            const city = s.city ?? '';

            return (
              <Card key={s.id}>
                {/* Заголовок */}
                <div className="p-4">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2">
                    {title}
                  </h3>
                  {category ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category}
                    </p>
                  ) : null}
                </div>

                {/* Картинка (если есть) */}
                {imageUrl ? (
                  <div className="px-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-48 w-full rounded-xl object-cover"
                    />
                  </div>
                ) : null}

                {/* Контент */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">{price}</span>
                    {city ? (
                      <span className="text-sm text-muted-foreground">
                        {city}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
