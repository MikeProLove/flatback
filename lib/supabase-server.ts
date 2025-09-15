// lib/supabase-server.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Серверный клиент (может отсутствовать на билде/в превью — тогда вернём null) */
export function getSupabaseServer(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  return createClient(URL, KEY, {
    auth: { persistSession: false },
  });
}
