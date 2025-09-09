'use server';
import { supabaseServer } from '@/lib/supabase-server';

export async function listProducts() {
  const { data, error } = await supabaseServer.from('products').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function listServices() {
  const { data, error } = await supabaseServer.from('services').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createProduct(p: { name: string; description?: string; price: number; category?: string; stock_qty?: number; }) {
  const { error } = await supabaseServer.from('products').insert(p);
  if (error) throw new Error(error.message);
}

export async function createService(s: { name: string; description?: string; price: number; category?: string; execution_time_minutes?: number; }) {
  const { error } = await supabaseServer.from('services').insert(s);
  if (error) throw new Error(error.message);
}