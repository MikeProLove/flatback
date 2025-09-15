// lib/supabase-browser.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Клиент для браузера. Если env не прокинуты — вернёт null. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  return createClient(URL, KEY);
}
