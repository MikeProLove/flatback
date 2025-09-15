// lib/supabase-server.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Безопасный серверный клиент (на билде/без env вернёт null) */
export function getSupabaseServer(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  return createClient(URL, KEY, { auth: { persistSession: false } });
}
