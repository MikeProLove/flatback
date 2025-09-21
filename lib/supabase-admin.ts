// lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url) {
    throw new Error('ENV missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  }
  if (!serviceKey) {
    throw new Error('ENV missing: SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
