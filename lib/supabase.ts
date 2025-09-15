// lib/supabase.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Клиент для чтения (по анонимному ключу). RLS пропустит только авторизованных (см. policies).
export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});
