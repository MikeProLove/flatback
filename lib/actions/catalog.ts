// lib/actions/catalog.ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase-server';

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;          // NUMERIC -> string, приводим ниже
  category: string | null;
  stock_qty: number | null;
};

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;          // NUMERIC -> string, приводим ниже
  category: string | null;
  execution_time_minutes: number | null;
};

export async function fetchProducts(): Promise<ProductRow[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, category, stock_qty')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchProducts error:', error);
    return [];
  }

  return (data ?? []).map((p) => ({
    ...p,
    price: p.price === null ? null : Number(p.price),
  }));
}

export async function fetchServices(): Promise<ServiceRow[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, price, category, execution_time_minutes')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchServices error:', error);
    return [];
  }

  return (data ?? []).map((s) => ({
    ...s,
    price: s.price === null ? null : Number(s.price),
  }));
}
