// app/debug/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export default async function DebugPage() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let ping: string = 'skip';
  try {
    const { getSafeSupabase } = await import('@/lib/supabase');
    const supabase = getSafeSupabase();
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    ping = data?.length ? 'ok (products found or empty table)' : 'ok (empty table)';
  } catch (e: any) {
    ping = `error: ${e.message ?? String(e)}`;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Debug</h1>
      <pre className="rounded bg-gray-100 p-3">
        {JSON.stringify(
          {
            NEXT_PUBLIC_SUPABASE_URL: hasUrl ? 'present' : 'missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: hasKey ? 'present' : 'missing',
            db_ping: ping,
          },
          null,
          2
        )}
      </pre>
      <p className="text-sm text-gray-600">
        Если db_ping = <b>error</b> — смотри логи Vercel (Deployments → Logs) и Policies в Supabase.
      </p>
    </div>
  );
}
