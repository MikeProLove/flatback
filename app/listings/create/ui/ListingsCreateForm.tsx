'use client';

import { useState } from 'react';
import MapPicker from '@/app/components/MapPicker';

export default function ListingCreateForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch('/api/listings', { method: 'POST', body: fd });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) throw new Error(data?.message || text || 'Не удалось создать объявление');
      if (data?.id) window.location.href = `/listings/${data.id}`;
      else window.location.href = '/listings';
    } catch (e: any) {
      setError(e?.message || 'Ошибка сети');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-sm">Заголовок</label>
          <input name="title" required className="w-full border rounded-md px-3 py-2" placeholder="Напр.: 2к у метро" />
        </div>
        <div className="space-y-3">
          <label className="block text-sm">Город</label>
          <input name="city" required className="w-full border rounded-md px-3 py-2" placeholder="Москва" />
        </div>

        <div className="space-y-3">
          <label className="block text-sm">Адрес</label>
          <input name="address" className="w-full border rounded-md px-3 py-2" placeholder="ул. Пушкина, д. 1" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-sm">Комнат</label>
            <input name="rooms" type="number" min={0} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Площадь, м²</label>
            <input name="area_total" type="number" min={0} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Этаж</label>
            <input name="floor" type="number" min={0} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">Цена в месяц (₽)</label>
          <input name="price" type="number" min={0} required className="w-full border rounded-md px-3 py-2" />
          <input type="hidden" name="currency" value="RUB" />
        </div>

        <div className="space-y-3">
          <label className="block text-sm">Метро (необязательно)</label>
          <input name="metro" className="w-full border rounded-md px-3 py-2" placeholder="Сокол" />
        </div>
      </div>

      {/* Карта и координаты */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Расположение</div>
        {/* скрытые поля для API */}
        <input id="listing-lat" name="lat" type="hidden" />
        <input id="listing-lng" name="lng" type="hidden" />
        <MapPicker latInputId="listing-lat" lngInputId="listing-lng" />
      </div>

      {/* Фото и 3D-тур */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm">Фотографии</label>
          <input name="photos" type="file" accept="image/*" multiple className="w-full border rounded-md px-3 py-2" />
          <div className="text-xs text-muted-foreground">Можно выбрать несколько файлов.</div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Файл 3D-тура (необязательно)</label>
          <input name="tour_file" type="file" className="w-full border rounded-md px-3 py-2" />
        </div>
      </div>

      {/* Описание */}
      <div className="space-y-2">
        <label className="block text-sm">Описание</label>
        <textarea name="description" rows={6} className="w-full border rounded-md px-3 py-2" />
      </div>

      {/* Параметры аренды (минимум) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm">Залог (₽, опционально)</label>
          <input name="deposit" type="number" min={0} className="w-full border rounded-md px-3 py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="utilities_included" type="checkbox" />
          Коммуналка включена
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="pets_allowed" type="checkbox" />
          Можно с питомцами
        </label>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : null}

      <div className="flex items-center gap-3">
        <button disabled={submitting} className="px-4 py-2 border rounded-md">
          {submitting ? 'Создаём…' : 'Создать объявление'}
        </button>
        <a href="/listings" className="text-sm underline">Отмена</a>
      </div>
    </form>
  );
}
