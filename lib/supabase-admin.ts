// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.warn('[supabase-admin] ENV missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export function getSupabaseAdmin() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: fetch as any },
  });
}
