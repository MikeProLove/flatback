'use client';

import { useState } from 'react';

type PhotoRow = { id: string; url: string; storage_path: string | null; sort_order: number | null };

type Props = {
  initial: Record<string, any>;
  initialPhotos: PhotoRow[];
};

export default function EditFormClient({ initial, initialPhotos }: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos || []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);

      // чистим пустые строки
      const entries = Array.from(fd.entries());
      for (let i = 0; i < entries.length; i++) {
        const [k, v] = entries[i];
        if (typeof v === 'string' && v.trim() === '') fd.delete(k);
      }

      const res = await fetch(`/api/listings/${initial.id}`, { method: 'PATCH', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Не удалось сохранить');
      }
      location.href = `/listings/${initial.id}`;
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  // ...вверху файла как у тебя

async function deletePhoto(ph: PhotoRow) {
  if (!confirm('Удалить это фото?')) return;
  try {
    // Простая query-строка — без JSON и заголовков
    const qs = new URLSearchParams();
    if (ph.id) qs.set('photo_id', ph.id);
    if (ph.storage_path) qs.set('storage_path', ph.storage_path);

    const res = await fetch(`/api/listings/${initial.id}/photos?${qs.toString()}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      let msg = 'Не удалось удалить';
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
        else if (j?.error) msg = String(j.error);
      } catch {}
      alert(msg);
      return;
    }

    setPhotos((prev) => prev.filter((p) => p.id !== ph.id));
  } catch (e: any) {
    alert(e?.message || 'Ошибка удаления');
  }
}

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Текущие фото + удаление */}
      <div>
        <div className="text-sm font-medium mb-2">Текущие фото</div>
        {photos.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-xl overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => deletePhoto(p)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-white/90 border"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Нет загруженных фото.</div>
        )}
      </div>

      {/* Поля формы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Заголовок</span>
          <input name="title" defaultValue={initial.title ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Цена, ₽/мес</span>
          <input name="price" type="number" min={0} defaultValue={initial.price ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Город</span>
          <input name="city" defaultValue={initial.city ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Адрес</span>
          <input name="address" defaultValue={initial.address ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Комнат</span>
          <input name="rooms" type="number" min={0} defaultValue={initial.rooms ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Площадь, м²</span>
          <input name="area_total" type="number" min={0} defaultValue={initial.area_total ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Этаж</span>
          <input name="floor" type="number" min={0} defaultValue={initial.floor ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Этажей в доме</span>
          <input name="floors_total" type="number" min={0} defaultValue={initial.floors_total ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-muted-foreground">Описание</span>
          <textarea name="description" defaultValue={initial.description ?? ''} rows={5} className="w-full border rounded px-3 py-2" />
        </label>

        {/* Координаты */}
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Широта (lat)</span>
          <input name="lat" type="number" step="any" defaultValue={initial.lat ?? ''} className="w-full border rounded px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Долгота (lng)</span>
          <input name="lng" type="number" step="any" defaultValue={initial.lng ?? ''} className="w-full border rounded px-3 py-2" />
        </label>

        {/* Новые фото */}
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-muted-foreground">Добавить фото</span>
          <input name="photos" type="file" multiple accept="image/*" className="block" />
          <div className="text-xs text-muted-foreground">Текущие фото сохранятся, новые — добавятся.</div>
        </label>
      </div>

      <div className="pt-2 flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 border rounded-md">
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <a href={`/listings/${initial.id}`} className="px-4 py-2 border rounded-md">Отмена</a>
      </div>
    </form>
  );
}
