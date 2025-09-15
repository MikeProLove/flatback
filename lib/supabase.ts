// lib/supabase.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  // Явная ошибка во время билда, если забыли переменные окружения
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Создаём одноразовый серверный клиент Supabase (без persistSession).
 * Подходит для безопасного чтения публичных таблиц (RLS: select for authenticated).
 */
export function getSupabaseServer(): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: false },
  });
}
