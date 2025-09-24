// app/listings/map/page.tsx
export const dynamic = 'force-dynamic';

import MapView from '../MapView';
import SearchBar from '../SearchBar';

export default function ListingsMapPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // пробрасываем текущие фильтры на карту
  const initial: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (Array.isArray(v)) initial[k] = v[0];
    else if (typeof v === 'string') initial[k] = v;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Объявления на карте</h1>
        <a href={`/listings?${new URLSearchParams(initial).toString()}`} className="text-sm underline">
          Список
        </a>
      </div>

      <SearchBar initial={initial} />

      <MapView initialCenter={{ lat: 55.751244, lng: 37.618423 }} initialRadiusKm={5} filters={initial} />
    </div>
  );
}
