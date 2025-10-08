'use client';

export default function Amenities({ listing }: { listing: any }) {
  const rows: Array<[string, string | number | boolean | null | undefined]> = [
    ['Тип дома', listing.building_type],
    ['Ремонт', listing.renovation],
    ['Мебель', listing.furniture],
    ['Техника', listing.appliances],
    ['Балкон/лоджия', listing.balcony],
    ['Санузел', listing.bathroom],
    ['Высота потолков', listing.ceiling_height ? `${listing.ceiling_height} м` : null],
    ['Парковка', listing.parking],
    ['Интернет', listing.internet],
    ['Консьерж', listing.concierge],
    ['Охрана', listing.security],
    ['Лифт', listing.lift],
    ['Коммуналка включена', listing.utilities_included ? 'да' : null],
    ['Можно с животными', listing.pets_allowed ? 'да' : null],
    ['Можно с детьми', listing.kids_allowed ? 'да' : null],
    ['Метро', listing.metro],
    [
      'До метро',
      typeof listing.metro_distance_min === 'number'
        ? `${listing.metro_distance_min} мин`
        : null,
    ],
  ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');

  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border p-4">
      <div className="font-medium mb-3">Характеристики</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <div className="text-muted-foreground w-40">{k}</div>
            <div className="font-medium">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
