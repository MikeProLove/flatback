// app/listings/[id]/ui/Amenities.tsx
'use client';

type AmenityValue = string | number | boolean | null | undefined;
type AmenityRow = [string, AmenityValue];

export default function Amenities({ listing }: { listing: any }) {
  // нормализуем значения для вывода
  const norm = (v: AmenityValue): string | null => {
    if (v === true) return 'да';
    if (v === false || v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  };

  // массив удобств/характеристик
  const raw = [
    ['Тип дома', listing?.building_type],
    ['Ремонт', listing?.renovation],
    ['Мебель', listing?.furniture],
    ['Техника', listing?.appliances],
    ['Балкон/лоджия', listing?.balcony],
    ['Санузел', listing?.bathroom],
    ['Высота потолков', typeof listing?.ceiling_height === 'number' ? `${listing.ceiling_height} м` : null],
    ['Парковка', listing?.parking],
    ['Интернет', listing?.internet],
    ['Консьерж', listing?.concierge],
    ['Охрана', listing?.security],
    ['Лифт', listing?.lift],
    ['Коммуналка включена', listing?.utilities_included],
    ['Можно с животными', listing?.pets_allowed],
    ['Можно с детьми', listing?.kids_allowed],
    ['Метро', listing?.metro],
    [
      'До метро',
      typeof listing?.metro_distance_min === 'number' ? `${listing.metro_distance_min} мин` : null,
    ],
    // можно добавить ещё поля по необходимости
  ] as AmenityRow[]; // <- приводим к нужному типу кортежей

  const rows = raw
    .map<[string, string | null]>(([k, v]) => [k, norm(v)])
    .filter(([, v]) => v !== null);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border p-4">
      <div className="font-medium mb-3">Характеристики</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <div className="text-muted-foreground w-40">{k}</div>
            <div className="font-medium">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
