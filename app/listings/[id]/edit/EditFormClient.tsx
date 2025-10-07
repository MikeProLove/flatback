'use client';

import { useState } from 'react';

type Props = { initial: Record<string, any> };

export default function EditFormClient({ initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget); // multipart/form-data

      // Пустые строки убираем, чтобы не затирать null'ами.
      // Используем Array.from, чтобы не требовался downlevelIteration.
      const entries = Array.from(fd.entries());
      for (let i = 0; i < entries.length; i++) {
        const [k, v] = entries[i];
        if (typeof v === 'string' && v.trim() === '') {
          fd.delete(k);
        }
      }

      const res = await fetch(`/api/listings/${initial.id}`, {
        method: 'PATCH',
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Не удалось сохранить');
      }

      // Назад на страницу объявления
      location.href = `/listings/${initial.id}`;
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Заголовок</span>
          <input
            name="title"
            defaultValue={initial.title ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Цена, ₽/мес</span>
          <input
            name="price"
            type="number"
            min={0}
            defaultValue={initial.price ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Город</span>
          <input
            name="city"
            defaultValue={initial.city ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Адрес</span>
          <input
            name="address"
            defaultValue={initial.address ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Комнат</span>
          <input
            name="rooms"
            type="number"
            min={0}
            defaultValue={initial.rooms ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Площадь, м²</span>
          <input
            name="area_total"
            type="number"
            min={0}
            defaultValue={initial.area_total ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Этаж</span>
          <input
            name="floor"
            type="number"
            min={0}
            defaultValue={initial.floor ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Этажей в доме</span>
          <input
            name="floors_total"
            type="number"
            min={0}
            defaultValue={initial.floors_total ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-muted-foreground">Описание</span>
          <textarea
            name="description"
            defaultValue={initial.description ?? ''}
            rows={5}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        {/* Координаты — можно вручную подредактировать */}
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Широта (lat)</span>
          <input
            name="lat"
            type="number"
            step="any"
            defaultValue={initial.lat ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Долгота (lng)</span>
          <input
            name="lng"
            type="number"
            step="any"
            defaultValue={initial.lng ?? ''}
            className="w-full border rounded px-3 py-2"
          />
        </label>

        {/* Новые фото можно добавить (не перетираем существующие) */}
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-muted-foreground">Добавить фото</span>
          <input name="photos" type="file" multiple accept="image/*" className="block" />
          <div className="text-xs text-muted-foreground">
            Текущие фото сохранятся, новые — добавятся.
          </div>
        </label>
      </div>

      <div className="pt-2 flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 border rounded-md">
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <a href={`/listings/${initial.id}`} className="px-4 py-2 border rounded-md">
          Отмена
        </a>
      </div>
    </form>
  );
}
