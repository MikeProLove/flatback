// lib/supabase-admin.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Админ-клиент для серверных роутов (Storage, RLS-bypass и пр.)
 * Принимает ЛЮБОЙ из двух вариантов переменных — чтобы не падать.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[supabase-admin] Missing env: ' +
        JSON.stringify({
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-application': 'flatback-admin' } },
  });

  return cached;
}
