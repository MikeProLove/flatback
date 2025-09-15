// app/(debug)/debug/page.tsx
export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  const { getSupabaseServer } = await import('@/lib/supabase-server');
  const supabase = getSupabaseServer();

  let status = 'env: MISSING';
  let note = '';

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        status = 'query: ERROR';
        note = String(error.message ?? error);
      } else {
        status = `ok: ${data?.length ? 'rows found' : 'empty table'}`;
      }
    } catch (e: any) {
      status = 'query: THROW';
      note = String(e?.message ?? e);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-3 text-xl font-semibold">Debug</h1>
      <pre className="rounded bg-gray-100 p-3 text-sm">
        {JSON.stringify({ status, note }, null, 2)}
      </pre>
    </div>
  );
}
