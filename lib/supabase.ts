// lib/supabase.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

/**
 * Строгий серверный клиент.
 * Бросает ошибку, если переменных нет (подходит для Production, server actions).
 */
export function getSupabaseServer(): SupabaseClient {
  if (!URL || !ANON) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

/**
 * Безопасный вариант для страниц, чтобы билд не падал.
 * Возвращает null, если переменных нет на этапе билда/пререндеринга.
 */
export function getSafeSupabase(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  if (!cachedClient) {
    cachedClient = createClient(URL, ANON, { auth: { persistSession: false } });
  }
  return cachedClient;
}
