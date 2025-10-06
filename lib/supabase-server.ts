// lib/supabase-server.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Серверный клиент (RLS включён), для страниц/route handlers.
 * Берёт URL из SUPABASE_URL ИЛИ NEXT_PUBLIC_SUPABASE_URL,
 * ключ — из NEXT_PUBLIC_SUPABASE_ANON_KEY ИЛИ SUPABASE_ANON_KEY.
 */
export function getSupabaseServer(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!url || !anonKey) {
    throw new Error(
      '[supabase-server] Missing env: ' +
        JSON.stringify({
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        })
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-application': 'flatback-server' } },
  });
}
