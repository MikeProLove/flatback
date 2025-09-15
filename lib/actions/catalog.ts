// lib/actions/catalog.ts
import 'server-only';
import { supabase } from '@/lib/supabase';

// ВАЖНО: в нашей схеме price = NUMERIC(12,2).
// Supabase-js возвращает numeric как string -> приводим к number.

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;            // уже приведён к number
  category: string | null;
  available: boolean;
  stock_qty: number;
};

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;            // уже приведён к number
  category: string | null;
  execution_time_minutes: number | null;
};

export async function listProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price,category,available,stock_qty')
    .eq('available', true)
    .order('name', { ascending: true });

  if (error) throw new Error(`listProducts: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    ...r,
    price: Number(r.price), // numeric -> number
  }));
}

export async function listServices(): Promise<ServiceRow[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id,name,description,price,category,execution_time_minutes')
    .order('name', { ascending: true });

  if (error) throw new Error(`listServices: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    ...r,
    price: Number(r.price), // numeric -> number
  }));
}
