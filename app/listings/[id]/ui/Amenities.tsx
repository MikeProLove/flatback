'use client';

type V = string | number | boolean | null | undefined | Record<string, any> | any[];

const APPLIANCE_LABELS: Record<string, string> = {
  fridge: 'холодильник',
  washer: 'стиральная машина',
  dishwasher: 'посудомойка',
  tv: 'телевизор',
  ac: 'кондиционер',
  oven: 'духовка',
  stove: 'плита',
};

function human(v: V): string | null {
  if (v === true) return 'да';
  if (v === false || v == null) return null;
  if (Array.isArray(v)) {
    const items = v.map((x) => human(x)).filter(Boolean) as string[];
    return items.length ? items.join(', ') : null;
  }
  if (typeof v === 'object') {
    const items = Object.entries(v as Record<string, any>)
      .filter(([, val]) => !!val)
      .map(([k]) => APPLIANCE_LABELS[k] || k);
    return items.length ? items.join(', ') : null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

export default function Amenities({ listing }: { listing: any }) {
  const raw: Array<[string, V]> = [
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
    ['До метро', typeof listing?.metro_distance_min === 'number' ? `${listing.metro_distance_min} мин` : null],
  ];

  const rows = raw
    .map(([k, v]) => [k, human(v)] as [string, string | null])
    .filter(([, v]) => v !== null);

  if (!rows.length) return null;

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
