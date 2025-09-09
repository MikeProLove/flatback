// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js';

// Берём URL из любого доступного имени
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || // серверный ключ — приоритет
  process.env.SUPABASE_ANON_KEY ||         // fallback
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('Missing Supabase URL env');
if (!SUPABASE_KEY) throw new Error('Missing Supabase key env');

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
