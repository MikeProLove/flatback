'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Photo = { id: string; url: string; sort_order: number };

export default function EditListingForm({ listing, photos }: { listing: any; photos: Photo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [removeTour, setRemoveTour] = useState(false);

  // все поля — заполняем из listing (с защитой от null)
  const [status, setStatus] = useState<string>(listing.status ?? 'draft');
  const [title, setTitle] = useState<string>(listing.title ?? '');
  const [price, setPrice] = useState<string>(listing.price ?? '');
  const [currency, setCurrency] = useState<string>(listing.currency ?? 'RUB');
  const [rooms, setRooms] = useState<string>(listing.rooms ?? '');
  const [area_total, setAreaTotal] = useState<string>(listing.area_total ?? '');
  const [area_living, setAreaLiving] = useState<string>(listing.area_living ?? '');
  const [area_kitchen, setAreaKitchen] = useState<string>(listing.area_kitchen ?? '');
  const [floor, setFloor] = useState<string>(listing.floor ?? '');
  const [floors_total, setFloorsTotal] = useState<string>(listing.floors_total ?? '');
  const [address, setAddress] = useState<string>(listing.address ?? '');
  const [city, setCity] = useState<string>(listing.city ?? '');
  const [district, setDistrict] = useState<string>(listing.district ?? '');
  const [metro, setMetro] = useState<string>(listing.metro ?? '');
  const [metro_distance_min, setMetroDist] = useState<string>(listing.metro_distance_min ?? '');
  const [lat, setLat] = useState<string>(listing.lat ?? '');
  const [lng, setLng] = useState<string>(listing.lng ?? '');
  const [description, setDescription] = useState<string>(listing.description ?? '');
  const [deposit, setDeposit] = useState<string>(listing.deposit ?? '');
  const [utilities_included, setUtilities] = useState<boolean>(!!listing.utilities_included);
  const [pets_allowed, setPets] = useState<boolean>(!!listing.pets_allowed);
  const [kids_allowed, setKids] = useState<boolean>(!!listing.kids_allowed);
  const [available_from, setAvailableFrom] = useState<string>(listing.available_from?.slice(0, 10) ?? '');
  const [min_term_months, setMinTerm] = useState<string>(listing.min_term_months ?? '');
  const [building_type, setBuildingType] = useState<string>(listing.building_type ?? '');
  const [renovation, setRenovation] = useState<string>(listing.renovation ?? '');
  const [furniture, setFurniture] = useState<string>(listing.furniture ?? '');
  const [appliances, setAppliances] = useState<string>(listing.appliances ?? '');
  const [balcony, setBalcony] = useState<boolean>(!!listing.balcony);
  const [bathroom, setBathroom] = useState<string>(listing.bathroom ?? '');
  const [ceiling_height, setCeiling] = useState<string>(listing.ceiling_height ?? '');
  const [parking, setParking] = useState<string>(listing.parking ?? '');
  const [internet, setInternet] = useState<boolean>(!!listing.internet);
  const [concierge, setConcierge] = useState<boolean>(!!listing.concierge);
  const [security, setSecurity] = useState<boolean>(!!listing.security);
  const [lift, setLift] = useState<boolean>(!!listing.lift);
  const [tour_url, setTourUrl] = useState<string>(listing.tour_url ?? '');

  function toggleRemove(id: string) {
    setRemoveIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      // простые
      fd.append('status', status);
      fd.append('title', title);
      fd.append('price', price);
      fd.append('currency', currency);
      fd.append('rooms', rooms);
      fd.append('area_total', area_total);
      fd.append('area_living', area_living);
      fd.append('area_kitchen', area_kitchen);
      fd.append('floor', floor);
      fd.append('floors_total', floors_total);
      fd.append('address', address);
      fd.append('city', city);
      fd.append('district', district);
      fd.append('metro', metro);
      fd.append('metro_distance_min', metro_distance_min);
      fd.append('lat', lat);
      fd.append('lng', lng);
      fd.append('description', description);
      fd.append('deposit', deposit);
      fd.append('available_from', available_from);
      fd.append('min_term_months', min_term_months);
      fd.append('building_type', building_type);
      fd.append('renovation', renovation);
      fd.append('furniture', furniture);
      fd.append('appliances', appliances);
      fd.append('bathroom', bathroom);
      fd.append('ceiling_height', ceiling_height);
      fd.append('parking', parking);
      fd.append('tour_url', tour_url);

      // булевые как 'on'/пусто
      if (utilities_included) fd.append('utilities_included', 'on');
      if (pets_allowed) fd.append('pets_allowed', 'on');
      if (kids_allowed) fd.append('kids_allowed', 'on');
      if (balcony) fd.append('balcony', 'on');
      if (internet) fd.append('internet', 'on');
      if (concierge) fd.append('concierge', 'on');
      if (security) fd.append('security', 'on');
      if (lift) fd.append('lift', 'on');

      // новые фото
      const input = (e.target as HTMLFormElement).elements.namedItem('new_photos') as HTMLInputElement | null;
      if (input?.files?.length) Array.from(input.files).forEach((f) => fd.append('new_photos', f));

      // удалить выбранные фото
      if (removeIds.length) fd.append('remove_photo_ids', JSON.stringify(removeIds));

      // 3D-тур: файл и флаг удаления
      const tourInput = (e.target as HTMLFormElement).elements.namedItem('tour_file') as HTMLInputElement | null;
      if (tourInput?.files?.[0]) fd.append('tour_file', tourInput.files[0]);
      if (removeTour) fd.append('remove_tour_file', 'on');

      const res = await fetch(`/api/listings/${listing.id}`, { method: 'PATCH', body: fd });
      if (!res.ok) throw new Error(await res.text());

      router.push(`/listings/${listing.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Статус и базовые */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm">Статус</label>
          <select className="w-full border rounded-md px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Черновик</option>
            <option value="published">Опубликовано</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm">Заголовок</label>
          <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Цена, ₽/мес</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Валюта</label>
          <select className="w-full border rounded-md px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      {/* Характеристики */}
      <div className="rounded-2xl border p-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm">Комнат</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={rooms} onChange={(e) => setRooms(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Площадь общая, м²</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={area_total} onChange={(e) => setAreaTotal(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Жилая, м²</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={area_living} onChange={(e) => setAreaLiving(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Кухня, м²</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={area_kitchen} onChange={(e) => setAreaKitchen(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Этаж</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={floor} onChange={(e) => setFloor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Всего этажей</label>
          <input type="number" className="w-full border rounded-md px-3 py-2" value={floors_total} onChange={(e) => setFloorsTotal(e.target.value)} />
        </div>
      </div>

      {/* Адрес */}
      <div className="rounded-2xl border p-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1"><label className="text-sm">Адрес</label><input className="w-full border rounded-md px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Город</label><input className="w-full border rounded-md px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Район</label><input className="w-full border rounded-md px-3 py-2" value={district} onChange={(e) => setDistrict(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Метро</label><input className="w-full border rounded-md px-3 py-2" value={metro} onChange={(e) => setMetro(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">До метро, мин.</label><input type="number" className="w-full border rounded-md px-3 py-2" value={metro_distance_min} onChange={(e) => setMetroDist(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Широта</label><input type="number" className="w-full border rounded-md px-3 py-2" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Долгота</label><input type="number" className="w-full border rounded-md px-3 py-2" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
      </div>

      {/* Условия */}
      <div className="rounded-2xl border p-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-1"><label className="text-sm">Залог, ₽</label><input type="number" className="w-full border rounded-md px-3 py-2" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Доступно с</label><input type="date" className="w-full border rounded-md px-3 py-2" value={available_from} onChange={(e) => setAvailableFrom(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Мин. срок, мес</label><input type="number" className="w-full border rounded-md px-3 py-2" value={min_term_months} onChange={(e) => setMinTerm(e.target.value)} /></div>

        <label className="flex items-center gap-2"><input type="checkbox" checked={utilities_included} onChange={(e) => setUtilities(e.target.checked)} /> Коммуналка включена</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={pets_allowed} onChange={(e) => setPets(e.target.checked)} /> С животными</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={kids_allowed} onChange={(e) => setKids(e.target.checked)} /> С детьми</label>
      </div>

      {/* Дом/ремонт/комплектация */}
      <div className="rounded-2xl border p-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-1"><label className="text-sm">Тип дома</label><input className="w-full border rounded-md px-3 py-2" value={building_type} onChange={(e) => setBuildingType(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Ремонт</label><input className="w-full border rounded-md px-3 py-2" value={renovation} onChange={(e) => setRenovation(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Мебель</label><input className="w-full border rounded-md px-3 py-2" value={furniture} onChange={(e) => setFurniture(e.target.value)} /></div>
        <div className="space-y-1 md:col-span-2"><label className="text-sm">Техника (через запятую)</label><input className="w-full border rounded-md px-3 py-2" value={appliances} onChange={(e) => setAppliances(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Санузел</label><input className="w-full border rounded-md px-3 py-2" value={bathroom} onChange={(e) => setBathroom(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Потолки, м</label><input type="number" className="w-full border rounded-md px-3 py-2" value={ceiling_height} onChange={(e) => setCeiling(e.target.value)} /></div>
        <div className="space-y-1"><label className="text-sm">Парковка</label><input className="w-full border rounded-md px-3 py-2" value={parking} onChange={(e) => setParking(e.target.value)} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={balcony} onChange={(e) => setBalcony(e.target.checked)} /> Балкон</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={internet} onChange={(e) => setInternet(e.target.checked)} /> Интернет</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={concierge} onChange={(e) => setConcierge(e.target.checked)} /> Консьерж</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={security} onChange={(e) => setSecurity(e.target.checked)} /> Охрана</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={lift} onChange={(e) => setLift(e.target.checked)} /> Лифт</label>
      </div>

      {/* 3D-тур */}
      <div className="rounded-2xl border p-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm">Ссылка на 3D-тур</label>
          <input className="w-full border rounded-md px-3 py-2" value={tour_url} onChange={(e) => setTourUrl(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Файл тура (заменит существующий)</label>
          <input name="tour_file" type="file" />
          {listing.tour_file_path ? (
            <label className="flex items-center gap-2 mt-1">
              <input type="checkbox" checked={removeTour} onChange={(e) => setRemoveTour(e.target.checked)} />
              Удалить текущий файл тура
            </label>
          ) : null}
        </div>
      </div>

      {/* Фото */}
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
        <div className="space-y-1">
          <label className="text-sm">Добавить фото</label>
          <input name="new_photos" type="file" multiple accept="image/*" />
        </div>
      </div>

      {/* Описание */}
      <div className="space-y-1">
        <label className="text-sm">Описание</label>
        <textarea rows={6} className="w-full border rounded-md px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
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
