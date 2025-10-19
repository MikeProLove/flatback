export const dynamic = 'force-dynamic';
export const revalidate = 0;

import RequestCard from '@/components/RequestCard';

async function getData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/requests/incoming`, {
    cache: 'no-store',
  });
  if (!res.ok) return { rows: [] as any[] };
  return res.json();
}

export default async function IncomingRequestsPage() {
  const { rows } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Заявки на мои</h1>

      {rows.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">Заявок пока нет.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r: any) => (
            <RequestCard key={r.id} row={r} variant="incoming" />
          ))}
        </div>
      )}
    </div>
  );
}
