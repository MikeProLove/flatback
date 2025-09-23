'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Photo = { id: string; url: string; sort_order: number };

export default function EditListingForm({
  listing,
  photos,
}: {
  listing: any;
  photos: Photo[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState<string>(listing.title ?? '');
  const [price, setPrice] = useState<string>(listing.price ?? '');
  const [city, setCity] = useState<string>(listing.city ?? '');
  const [rooms, setRooms] = useState<string>(listing.rooms ?? '');
  const [area, setArea] = useState<string>(listing.area_total ?? '');
  const [description, setDescription] = useState<string>(listing.description ?? '');
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleRemove(id: string) {
    setRemoveIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('price', price);
      fd.append('city', city);
      fd.append('rooms', rooms);
      fd.append('area_total', area);
      fd.append('description', description);

      // новые фото
      const input = (e.target as HTMLFormElement).elements.namedItem('new_photos') as HTMLInputElement | null;
      if (input?.files && input.files.length) {
        Array.from(input.files).forEach((f) => fd.append('new_photos', f));
      }

      // какие фото удалить
      if (removeIds.length) {
        fd.append('remove_photo_ids', JSON.stringify(removeIds));
      }

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'update failed');
      }

      router.push(`/listings/${listing.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm">Заголовок</label>
          <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Город</label>
          <input className="w-full border rounded-md px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Цена, ₽/мес</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Комнат</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={rooms} onChange={(e) => setRooms(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Площадь, м²</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm">Описание</label>
        <textarea rows={6} className="w-full border rounded-md px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="font-medium">Текущие фото</div>
        {photos.length === 0 ? (
          <div className="text-sm text-muted-foreground">Фото пока нет.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((p) => (
              <label key={p.id} className="relative cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-40 object-cover rounded-md" />
                <input
                  type="checkbox"
                  className="absolute top-2 left-2 h-4 w-4"
                  checked={removeIds.includes(p.id)}
                  onChange={() => toggleRemove(p.id)}
                />
                <span className="absolute top-2 left-8 text-xs bg-white/80 rounded px-1">Удалить</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm">Добавить фото</label>
        <input name="new_photos" type="file" multiple accept="image/*" />
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="flex justify-end gap-2">
        <a href={`/listings/${listing.id}`} className="px-4 py-2 border rounded-md">Отмена</a>
        <button type="submit" disabled={busy} className="px-4 py-2 border rounded-md">
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
