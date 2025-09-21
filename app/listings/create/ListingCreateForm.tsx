'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type PhotoPreview = { file: File; url: string };

export default function ListingCreateForm() {
  const router = useRouter();

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [tourName, setTourName] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // чат-заглушка
  const [chat, setChat] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Привет! Прикрепите выписку из ЕГРН — в проде я заполню поля автоматически.' },
  ]);
  const [msg, setMsg] = useState('');

  function onPickPhotos(files: FileList | null) {
    if (!files) return;
    const arr: PhotoPreview[] = [];
    Array.from(files).forEach((f) => arr.push({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...arr]);
  }

  const totalAreaHint = useMemo(() => 'Общая площадь, м²', []);
  const kitchenAreaHint = useMemo(() => 'Площадь кухни, м²', []);
  const livingAreaHint = useMemo(() => 'Жилая площадь, м²', []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const form = new FormData(e.currentTarget);
      photos.forEach((p) => form.append('photos', p.file));
      const res = await fetch('/api/listings', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      router.push(`/listings/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    } finally {
      setSending(false);
    }
  }

  async function sendChat() {
    if (!msg.trim()) return;
    const text = msg.trim();
    setChat((c) => [...c, { role: 'user', text }]);
    setMsg('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setChat((c) => [...c, { role: 'bot', text: data.reply }]);
    } catch {
      setChat((c) => [...c, { role: 'bot', text: 'Не удалось отправить сообщение (заглушка).' }]);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Левая колонка */}
      <div className="lg:col-span-2 space-y-6">
        {/* Фото */}
        <section className="rounded-2xl border p-4 space-y-3">
          <div className="font-medium">Фотографии</div>
          <input type="file" accept="image/*" multiple onChange={(e) => onPickPhotos(e.target.files)} />
          {photos.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt="" className="h-28 w-full object-cover rounded-md" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Загрузите 5–15 фото (кухня, спальня, санузел, вид из окна).</p>
          )}
        </section>

        {/* 3D-тур */}
        <section className="rounded-2xl border p-4 space-y-3">
          <div className="font-medium">3D-тур</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm">Ссылка (Matterport/Kuula и т.п.)</label>
              <input name="tour_url" type="url" placeholder="https://..." className="w-full border rounded-md px-3 py-2" />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Или файл тура</label>
              <input
                name="tour_file"
                type="file"
                accept=".zip,.mp4,.mov,.gltf,.glb,.usdz,.bin"
                onChange={(e) => setTourName(e.target.files?.[0]?.name || '')}
              />
              {tourName ? <div className="text-xs text-muted-foreground">Файл: {tourName}</div> : null}
            </div>
          </div>
        </section>

        {/* Основное */}
        <section className="rounded-2xl border p-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm">Заголовок</label>
            <input name="title" type="text" className="w-full border rounded-md px-3 py-2" placeholder="Светлая 2-к у метро…" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Стоимость (₽/мес.)</label>
            <input name="price" type="number" min={0} className="w-full border rounded-md px-3 py-2" required />
            <input type="hidden" name="currency" value="RUB" />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Комнат</label>
            <input name="rooms" type="number" min={0} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">{totalAreaHint}</label>
            <input name="area_total" type="number" step="0.1" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">{kitchenAreaHint}</label>
            <input name="area_kitchen" type="number" step="0.1" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">{livingAreaHint}</label>
            <input name="area_living" type="number" step="0.1" className="w-full border rounded-md px-3 py-2" />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Этаж</label>
            <input name="floor" type="number" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Этажей в доме</label>
            <input name="floors_total" type="number" className="w-full border rounded-md px-3 py-2" />
          </div>
        </section>

        {/* Локация */}
        <section className="rounded-2xl border p-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm">Адрес</label>
            <input name="address" type="text" className="w-full border rounded-md px-3 py-2" placeholder="Город, улица, дом…" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Город</label>
            <input name="city" type="text" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Район</label>
            <input name="district" type="text" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Ближайшее метро</label>
            <input name="metro" type="text" className="w-full border rounded-md px-3 py-2" placeholder="Напр.: Тверская" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">До метро (мин.)</label>
            <input name="metro_distance_min" type="number" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Широта (lat)</label>
            <input name="lat" type="number" step="0.000001" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Долгота (lng)</label>
            <input name="lng" type="number" step="0.000001" className="w-full border rounded-md px-3 py-2" />
          </div>
        </section>

        {/* Условия аренды */}
        <section className="rounded-2xl border p-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm">Залог (₽)</label>
            <input name="deposit" type="number" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Мин. срок (мес.)</label>
            <input name="min_term_months" type="number" className="w-full border rounded-md px-3 py-2" />
          </div>
          <label className="flex items-center gap-2"><input name="utilities_included" type="checkbox" /> Коммуналка включена</label>
          <label className="flex items-center gap-2"><input name="pets_allowed" type="checkbox" /> Можно с животными</label>
          <label className="flex items-center gap-2"><input name="kids_allowed" type="checkbox" /> Можно с детьми</label>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm">Доступно с</label>
            <input name="available_from" type="date" className="w-full border rounded-md px-3 py-2" />
          </div>
        </section>

        {/* Характеристики */}
        <section className="rounded-2xl border p-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm">Тип дома</label>
            <select name="building_type" className="w-full border rounded-md px-3 py-2">
              <option value="">Не указано</option>
              <option>панель</option><option>монолит</option><option>кирпич</option>
              <option>монолит-кирпич</option><option>блочный</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Ремонт</label>
            <select name="renovation" className="w-full border rounded-md px-3 py-2">
              <option value="">Не указано</option>
              <option>без ремонта</option><option>косметический</option>
              <option>евроремонт</option><option>дизайнерский</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Мебель</label>
            <select name="furniture" className="w-full border rounded-md px-3 py-2">
              <option value="">Не указано</option>
              <option>полная</option><option>частичная</option><option>нет</option>
            </select>
          </div>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm mb-2">Техника</legend>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <label className="flex items-center gap-2"><input name="appl_fridge" type="checkbox" /> Холодильник</label>
              <label className="flex items-center gap-2"><input name="appl_washer" type="checkbox" /> Стиральная машина</label>
              <label className="flex items-center gap-2"><input name="appl_dishwasher" type="checkbox" /> Посудомоечная</label>
              <label className="flex items-center gap-2"><input name="appl_oven" type="checkbox" /> Духовка</label>
              <label className="flex items-center gap-2"><input name="appl_microwave" type="checkbox" /> Микроволновка</label>
              <label className="flex items-center gap-2"><input name="appl_tv" type="checkbox" /> ТВ</label>
              <label className="flex items-center gap-2"><input name="appl_ac" type="checkbox" /> Кондиционер</label>
            </div>
          </fieldset>

          <label className="flex items-center gap-2"><input name="balcony" type="checkbox" /> Балкон/лоджия</label>
          <div className="space-y-2">
            <label className="text-sm">Санузел</label>
            <select name="bathroom" className="w-full border rounded-md px-3 py-2">
              <option value="">Не указано</option>
              <option>совмещенный</option><option>раздельный</option><option>несколько</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm">Высота потолков, м</label>
            <input name="ceiling_height" type="number" step="0.01" className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Парковка</label>
            <select name="parking" className="w-full border rounded-md px-3 py-2">
              <option value="">Не указано</option>
              <option>нет</option><option>двор</option><option>подземный</option><option>охраняемый</option>
            </select>
          </div>

          <label className="flex items-center gap-2"><input name="internet" type="checkbox" /> Интернет</label>
          <label className="flex items-center gap-2"><input name="concierge" type="checkbox" /> Консьерж</label>
          <label className="flex items-center gap-2"><input name="security" type="checkbox" /> Охрана/видео</label>
          <label className="flex items-center gap-2"><input name="lift" type="checkbox" /> Лифт</label>
        </section>

        {/* Описание */}
        <section className="rounded-2xl border p-4 space-y-2">
          <label className="text-sm">Описание</label>
          <textarea name="description" rows={6} className="w-full border rounded-md px-3 py-2" placeholder="Опишите квартиру, двор, инфраструктуру, условия…" />
        </section>

        {/* Submit */}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <div className="flex justify-end">
          <button type="submit" disabled={sending} className="px-4 py-2 rounded-md border">
            {sending ? 'Сохраняем…' : 'Сохранить объявление'}
          </button>
        </div>
      </div>

      {/* Правая колонка — чат */}
      <aside className="space-y-3">
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-2">ИИ-помощник (заглушка)</div>
          <div className="text-sm text-muted-foreground mb-3">
            Прикрепите документы (ЕГРН), напишите «Заполни», нажмите отправить — сообщение уйдёт в заглушку.
          </div>

          <div className="space-y-2">
            <input type="file" />
            <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full border rounded-md px-3 py-2" />
            <button type="button" onClick={sendChat} className="px-3 py-2 rounded-md border text-sm">Отправить в чат</button>
          </div>

          <div className="mt-4 space-y-2 max-h-64 overflow-auto">
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span className={m.role === 'user' ? 'font-medium' : 'text-muted-foreground'}>
                  {m.role === 'user' ? 'Вы: ' : 'Бот: '}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </form>
  );
}
