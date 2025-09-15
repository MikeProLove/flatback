// lib/actions/catalog.ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase';

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  // в нашей схеме price_cents INTEGER, а ранее мог быть price NUMERIC
  price_cents?: number | null;
  price?: number | null;
  is_active?: boolean | null;
};

export type Service = {
  id: string;
  name: string;
  description?: string | null;
  price_cents?: number | null;
  price?: number | null;
  is_active?: boolean | null;
};

// приведение цены к числу в рублях
function toRub(p?: number | null, c?: number | null): number {
  if (typeof c === 'number') return c / 100;
  if (typeof p === 'number') return p;
  return 0;
}

/** Список товаров (только активные), отсортированы по имени */
export async function listProducts(): Promise<Product[]> {
  const sb = getSupabaseServer();

  // пытаемся забирать универсально: и поля новой схемы, и старой
  const { data, error } = await sb
    .from('products')
    .select('id,name,description,price,price_cents,is_active')
    .order('name', { ascending: true });

  if (error) throw error;

  const items = (data ?? []).filter((x) => x.is_active ?? true) as Product[];
  // нормализуем price (на клиенте можно пользоваться toRub ещё раз)
  return items.map((x) => ({ ...x, price: toRub(x.price ?? null, x.price_cents ?? null) }));
}

/** Список услуг (только активные), отсортированы по имени */
export async function listServices(): Promise<Service[]> {
  const sb = getSupabaseServer();

  const { data, error } = await sb
    .from('services')
    .select('id,name,description,price,price_cents,is_active')
    .order('name', { ascending: true });

  if (error) throw error;

  const items = (data ?? []).filter((x) => x.is_active ?? true) as Service[];
  return items.map((x) => ({ ...x, price: toRub(x.price ?? null, x.price_cents ?? null) }));
}
