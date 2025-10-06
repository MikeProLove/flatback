'use client';

type Props = {
  sp: Record<string, string | undefined>;
};

export default function SearchBar({ sp }: Props) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)) as Record<string, string>
  ).toString();

  const take = (k: string) => (sp?.[k] ?? '') as string;

  return (
    <form action="/listings" method="get" className="rounded-2xl border p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          name="q"
          defaultValue={take('q')}
          placeholder="Например: студия у метро"
          className="w-full border rounded-md px-3 py-2"
        />
        <input name="city" defaultValue={take('city')} placeholder="Город" className="w-full border rounded-md px-3 py-2" />
        <input name="price_min" defaultValue={take('price_min')} placeholder="Цена от" className="w-full border rounded-md px-3 py-2" />
        <input name="price_max" defaultValue={take('price_max')} placeholder="Цена до" className="w-full border rounded-md px-3 py-2" />
        <input name="area_min" defaultValue={take('area_min')} placeholder="Площадь от, м²" className="w-full border rounded-md px-3 py-2" />
        <input name="area_max" defaultValue={take('area_max')} placeholder="Площадь до, м²" className="w-full border rounded-md px-3 py-2" />
        <input name="rooms" defaultValue={take('rooms')} placeholder="Комнат (число)" className="w-full border rounded-md px-3 py-2" />
        <select name="sort" defaultValue={take('sort') || 'latest'} className="w-full border rounded-md px-3 py-2">
          <option value="latest">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="area_desc">Площадь ↓</option>
        </select>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="with_photo" defaultChecked={take('with_photo') === 'on'} />
          Только с фото
        </label>

        <div className="ml-auto flex items-center gap-3">
          <button type="submit" className="px-3 py-2 border rounded-md text-sm">Найти</button>
          <a href="/listings" className="px-3 py-2 border rounded-md text-sm">Сбросить</a>
          <a
            href={`/listings/map${qs ? `?${qs}` : ''}`}
            className="px-3 py-2 border rounded-md text-sm"
            title="Показать на карте"
          >
            Карта
          </a>
        </div>
      </div>
    </form>
  );
}
