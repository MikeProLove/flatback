// lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  console.warn('[supabase-server] ENV missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabaseServer() {
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { fetch: fetch as any },
  });
}
