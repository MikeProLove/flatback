// lib/actions/properties.ts
'use server';
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase-server';

/** Строка из таблицы public.properties */
export type PropertyRow = {
  id: string;
  owner_id: string;
  title: string | null;
  description: string | null;
  address: string | null;
  price: number | null;        // NUMERIC в БД -> приводим к number ниже
  created_at: string;
};

/** Данные для создания объекта */
export type NewProperty = {
  owner_id: string;            // обязательный — FK на owners.id
  title?: string | null;
  description?: string | null;
  address?: string | null;
  price?: number | null;       // рубли; можно null
};

/** Список объектов (новые сверху). Без падений, просто пустой массив при ошибке/env-отсутствии. */
export async function listProperties(): Promise<PropertyRow[]> {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('properties')
    .select('id, owner_id, title, description, address, price, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listProperties error:', error);
    return [];
  }

  return (data ?? []).map((p: any) => ({
    ...p,
    price: p?.price == null ? null : Number(p.price),
  })) as PropertyRow[];
}

/** Получить один объект по id */
export async function getProperty(id: string): Promise<PropertyRow | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('properties')
    .select('id, owner_id, title, description, address, price, created_at')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getProperty error:', error);
    return null;
  }

  return data
    ? ({
        ...data,
        price: data.price == null ? null : Number(data.price),
      } as PropertyRow)
    : null;
}

/** Создать объект. Возвращает id созданной записи или сообщение об ошибке. */
export async function createProperty(input: NewProperty): Promise<{ id?: string; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) return { error: 'Supabase env is missing on server' };

  // лёгкая валидация
  if (!input.owner_id) return { error: 'owner_id is required' };

  const payload = {
    owner_id: input.owner_id,
    title: input.title ?? null,
    description: input.description ?? null,
    address: input.address ?? null,
    // В БД price NUMERIC(12,2); @supabase-js может вернуть/принять string — числа приводим к числу
    price:
      input.price == null
        ? null
        : Number.isFinite(Number(input.price))
        ? Number(input.price)
        : null,
  };

  const { data, error } = await supabase
    .from('properties')
    .insert([payload])
    .select('id')
    .single();

  if (error) {
    console.error('createProperty error:', error);
    return { error: error.message ?? 'Insert failed' };
  }

  return { id: data?.id };
}

/** Обновить объект частично */
export async function updateProperty(
  id: string,
  patch: Partial<Omit<NewProperty, 'owner_id'>> & { owner_id?: string }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Supabase env is missing on server' };

  const upd: Record<string, any> = {};
  if ('owner_id' in patch && patch.owner_id) upd.owner_id = patch.owner_id;
  if ('title' in patch) upd.title = patch.title ?? null;
  if ('description' in patch) upd.description = patch.description ?? null;
  if ('address' in patch) upd.address = patch.address ?? null;
  if ('price' in patch) {
    const v = patch.price;
    upd.price = v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  }

  const { error } = await supabase.from('properties').update(upd).eq('id', id);

  if (error) {
    console.error('updateProperty error:', error);
    return { ok: false, error: error.message ?? 'Update failed' };
  }
  return { ok: true };
}

/** Удалить объект */
export async function deleteProperty(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Supabase env is missing on server' };

  const { error } = await supabase.from('properties').delete().eq('id', id);

  if (error) {
    console.error('deleteProperty error:', error);
    return { ok: false, error: error.message ?? 'Delete failed' };
  }
  return { ok: true };
}
