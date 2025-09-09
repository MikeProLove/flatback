'use server';

import { supabaseServer } from '@/lib/supabase-server';

type NewProperty = {
  owner_id: string;
  title?: string | null;
  description?: string | null;
  address?: string | null;
  price: number;
};

export async function createProperty(data: NewProperty) {
  const { error } = await supabaseServer.from('properties').insert(data);
  if (error) throw new Error(error.message);
}

export async function listProperties() {
  const { data, error } = await supabaseServer
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
