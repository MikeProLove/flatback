// app/orders/[id]/edit/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { Product, Service } from '@/lib/types';
import AuthRequired from '@/components/AuthRequired';
import OrderForm from '../../create/OrderForm';

type OrderRow = {
  id: string;
  is_paid: boolean;
  status: string;
  user_id: string | null;
};

type ItemRow = {
  id: string;
  kind: 'product' | 'service';
  item_id: string;
  name: string;
  price: number;
  qty: number;
};

async function getAll(id: string, userId: string) {
  const supabase = getSupabaseServer();

  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .select('id, is_paid, status, user_id')
    .eq('id', id)
    .maybeSingle();

  if (orderErr || !orderData) return { order: null, items: [], products: [], services: [] };

  if ((orderData as OrderRow).user_id !== userId) {
    return { order: null, items: [], products: [], services: [] };
  }

  const [{ data: itemData }, { data: prodData }, { data: servData }] = await Promise.all([
    supabase.from('order_items').select('id, kind, item_id, name, price, qty').eq('order_id', id),
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('services').select('*').order('created_at', { ascending: false }),
  ]);

  return {
    order: orderData as OrderRow,
    items: (itemData as unknown as ItemRow[]) ?? [],
    products: (prodData as unknown as Product[]) ?? [],
    services: (servData as unknown as Service[]) ?? [],
  };
}

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Редактировать заказ</h1>
        <AuthRequired redirectTo={`/orders/${params.id}/edit`} />
      </div>
    );
  }

  const { order, items, products, services } = await getAll(params.id, userId);
  if (!order) notFound();

  if (order.is_paid || order.status !== 'pending') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold mb-2">Редактировать заказ</h1>
        <div className="rounded-2xl border p-6 text-sm">
          Редактирование недоступно: заказ {order.is_paid ? 'оплачен' : `в статусе “${order.status}”`}.
        </div>
        <a href={`/orders/${order.id}`} className="underline">Вернуться к заказу</a>
      </div>
    );
  }

  // Переводим строки заказа в формат OrderForm (Line[])
  const initialItems = items.map((it) => ({
    kind: it.kind,
    id: String(it.item_id),
    name: it.name,
    price: Number(it.price) || 0,
    qty: it.qty,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Редактировать заказ</h1>
      <OrderForm
        mode="edit"
        orderId={order.id}
        products={products}
        services={services}
        initialItems={initialItems}
      />
    </div>
  );
}
