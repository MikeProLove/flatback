// app/catalog/services/page.tsx
import React from 'react';
import Card from '@/components/Card';
import { money } from '@/lib/format';
import { getSupabaseServer } from '@/lib/supabase-server';
import { auth } from '@clerk/nextjs/server';
import AuthRequired from '@/components/AuthRequired';
import type { Service } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getServices(): Promise<Service[]> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[services] supabase error:', error.message);
    return [];
  }

  return (data as unknown as Service[]) ?? [];
}

export default async function ServicesPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Услуги</h1>
        <AuthRequired redirectTo="/catalog/services" />
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
            const title = (s as any).name ?? (s as any).title ?? 'Без названия';
            const category = (s as any).category ?? '';
            const imageUrl = (s as any).imageUrl ?? (s as any).image_url ?? '';
            const price =
              typeof (s as any).price === 'number'
                ? money((s as any).price as number)
                : (s as any).price ?? '—';
            const city = (s as any).city ?? '';

            return (
              <Card key={(s as any).id}>
                <div className="p-4">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2">
                    {title}
                  </h3>
                  {category ? (
                    <p className="mt-1 text-sm text-muted-foreground">{category}</p>
                  ) : null}
                </div>

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

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">{price}</span>
                    {city ? (
                      <span className="text-sm text-muted-foreground">{city}</span>
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
