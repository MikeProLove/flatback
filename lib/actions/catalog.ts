
// lib/actions/catalog.ts
import 'server-only';
import { getSafeSupabase } from '@/lib/supabase';

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price_cents?: number | null;
  price?: number | null;
  is_active?: boolean | null;
  category?: string | null;
  stock_qty?: number | null;
};

export type Service = {
  id: string;
  name: string;
  description?: string | null;
  price_cents?: number | null;
  price?: number | null;
  is_active?: boolean | null;
  category?: string | null;
  execution_time_minutes?: number | null;
};

function toRub(p?: number | null, c?: number | null): number {
  if (typeof c === 'number') return c / 100;
  if (typeof p === 'number') return p;
  return 0;
}

export async function listProducts(): Promise<Product[]> {
  const sb = getSafeSupabase();
  if (!sb) return []; // безопасно на билде/без env

  const { data, error } = await sb
    .from('products')
    .select('id,name,description,price,price_cents,is_active,category,stock_qty')
    .order('name', { ascending: true });

  if (error) throw error;

  const items = (data ?? []).filter((x) => x.is_active ?? true) as Product[];
  return items.map((x) => ({
    ...x,
    price: toRub(x.price ?? null, x.price_cents ?? null),
  }));
}

export async function listServices(): Promise<Service[]> {
  const sb = getSafeSupabase();
  if (!sb) return []; // безопасно на билде/без env

  const { data, error } = await sb
    .from('services')
    .select('id,name,description,price,price_cents,is_active,category,execution_time_minutes')
    .order('name', { ascending: true });

  if (error) throw error;

  const items = (data ?? []).filter((x) => x.is_active ?? true) as Service[];
  return items.map((x) => ({
    ...x,
    price: toRub(x.price ?? null, x.price_cents ?? null),
  }));
}
