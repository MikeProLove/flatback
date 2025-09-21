// app/orders/create/page.tsx
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { Product, Service } from '@/lib/types';
import AuthRequired from '@/components/AuthRequired';
import OrderForm from './OrderForm';

export const dynamic = 'force-dynamic';

async function getData() {
  const supabase = getSupabaseServer();

  const [prodRes, servRes] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('services').select('*').order('created_at', { ascending: false }),
  ]);

  const products = (prodRes.data as unknown as Product[]) ?? [];
  const services = (servRes.data as unknown as Service[]) ?? [];

  return { products, services };
}

export default async function CreateOrderPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Создать заказ</h1>
        <AuthRequired redirectTo="/orders/create" />
      </div>
    );
  }

  const { products, services } = await getData();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Создать заказ</h1>
      <OrderForm products={products} services={services} />
    </div>
  );
}
