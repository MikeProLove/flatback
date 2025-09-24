'use client';

type SearchKeys =
  | 'q'
  | 'city'
  | 'rooms'
  | 'price_min'
  | 'price_max'
  | 'area_min'
  | 'area_max'
  | 'sort'
  | 'with_photos';

type Initial = Partial<Record<SearchKeys, string>>;

type Props = {
  initial?: Initial;
};

export default function SearchBar({ initial = {} }: Props) {
  const get = (k: SearchKeys) => initial[k] ?? '';

  return (
    <form action="/listings" method="GET" className="rounded-2xl border p-4 grid gap-3 md:grid-cols-4">
      {/* Строка поиска */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-sm">Поиск (заголовок, адрес, город, описание)</label>
        <input
          name="q"
          defaultValue={get('q')}
          placeholder="Например: студия у метро"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Город */}
      <div className="space-y-1">
        <label className="text-sm">Город</label>
        <input name="city" defaultValue={get('city')} className="w-full border rounded-md px-3 py-2" />
      </div>

      {/* Комнат */}
      <div className="space-y-1">
        <label className="text-sm">Комнат</label>
        <input name="rooms" type="number" min={0} defaultValue={get('rooms')} className="w-full border rounded-md px-3 py-2" />
      </div>

      {/* Цена */}
      <div className="space-y-1">
        <label className="text-sm">Цена от</label>
        <input name="price_min" type="number" min={0} defaultValue={get('price_min')} className="w-full border rounded-md px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm">Цена до</label>
        <input name="price_max" type="number" min={0} defaultValue={get('price_max')} className="w-full border rounded-md px-3 py-2" />
      </div>

      {/* Площадь */}
      <div className="space-y-1">
        <label className="text-sm">Площадь от, м²</label>
        <input name="area_min" type="number" min={0} defaultValue={get('area_min')} className="w-full border rounded-md px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm">Площадь до, м²</label>
        <input name="area_max" type="number" min={0} defaultValue={get('area_max')} className="w-full border rounded-md px-3 py-2" />
      </div>

      {/* Только с фото */}
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input name="with_photos" type="checkbox" defaultChecked={get('with_photos') === '1'} />
          Только с фото
        </label>
      </div>

      {/* Сортировка */}
      <div className="space-y-1">
        <label className="text-sm">Сортировка</label>
        <select name="sort" defaultValue={get('sort') || 'latest'} className="w-full border rounded-md px-3 py-2">
          <option value="latest">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="area_desc">Площадь ↓</option>
        </select>
      </div>

      {/* Кнопки */}
      <div className="md:col-span-4 flex items-center gap-3">
        <button type="submit" className="px-4 py-2 border rounded-md">Найти</button>
        <a href="/listings" className="text-sm underline">Сбросить</a>
      </div>
    </form>
  );
}
