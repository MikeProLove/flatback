'use server';
import { supabaseServer } from '@/lib/supabase-server';

type Item = { id: string; qty: number; price: number };

export async function createOrder(input: {
  tenant_id?: string|null;
  owner_id?: string|null;
  products: Item[];
  services: Item[];
}) {
  const amount = [...input.products, ...input.services].reduce((sum, i) => sum + i.qty * i.price, 0);

  const { data: orderRow, error: orderErr } = await supabaseServer
    .from('orders')
    .insert({ tenant_id: input.tenant_id ?? null, owner_id: input.owner_id ?? null, amount, status: 'pending' })
    .select('id')
    .single();
  if (orderErr) throw new Error(orderErr.message);

  const order_id = orderRow.id as string;

  if (input.products.length) {
    const rows = input.products.map(p => ({ order_id, product_id: p.id, quantity: p.qty, sale_price: p.price }));
    const { error } = await supabaseServer.from('order_products').insert(rows);
    if (error) throw new Error(error.message);
  }

  if (input.services.length) {
    const rows = input.services.map(s => ({ order_id, service_id: s.id, quantity: s.qty, sale_price: s.price }));
    const { error } = await supabaseServer.from('order_services').insert(rows);
    if (error) throw new Error(error.message);
  }

  return { order_id, amount };
}