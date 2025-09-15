// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Один общий кэш в рантайме, чтобы не создавать клиента заново
let cachedClient: ReturnType<typeof createClient> | null = null;

/**
 * Безопасно возвращает public Supabase-клиент.
 * Если env отсутствуют (например, на этапе билда), вернёт null — и страница не упадёт.
 */
export function getSafeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // НИЧЕГО не бросаем на этапе импорта/билда.
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(url, key);
  }
  return cachedClient;
}
