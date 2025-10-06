// app/listings/map/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

const Map = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false });

type Row = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  rooms: number | null;
  area_total: number | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
};

function money(n: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n || 0);
  } catch { return `${Math.round(n||0)} ₽`; }
}

export default function ListingsMapPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number>(0);
  const [radiusKm, setRadiusKm] = useState(5);
  const mapRef = useRef<any>(null);

  const queryFromURL = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return sp.toString();
  }, []);

  async function searchHere() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;

    const res = await fetch(`/api/listings/search?${queryFromURL}${queryFromURL ? '&' : ''}bbox=${bbox}&per_page=500`);
    const json = await res.json();
    setRows(json.rows ?? []);
    setCount(json.count ?? 0);
  }

  useEffect(() => {
    searchHere(); // первичный запрос
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const center = [55.751244, 37.618423] as [number, number]; // Москва по умолчанию

  return (
    <div className="h-[calc(100vh-70px)] relative">
      {/* Панель поверх карты с правильным кликом */}
      <div
        className="absolute z-[1000] right-3 top-3 pointer-events-none"
        style={{ width: 260 }}
      >
        <div className="rounded-xl border bg-white/95 shadow p-3 space-y-2 pointer-events-auto">
          <div className="text-sm">Найдено: <b>{count}</b></div>
          <div className="text-xs text-muted-foreground">
            Радиус (визуально): {radiusKm} км
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2">
            <button onClick={searchHere} className="px-3 py-2 border rounded-md text-sm">Искать здесь</button>
            <button
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  const map = mapRef.current;
                  if (!map) return;
                  map.setView([pos.coords.latitude, pos.coords.longitude], 13);
                });
              }}
              className="px-3 py-2 border rounded-md text-sm"
            >
              Моя гео
            </button>
          </div>
          <div className="text-xs">
            Фильтры берём из URL (как у списка). Кнопка «Искать здесь» обновляет точки.
          </div>
        </div>
      </div>

      <Map
        center={center}
        zoom={12}
        whenCreated={(m) => (mapRef.current = m)}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Визуальный круг — удобно настраивать радиус */}
        <Circle center={center} radius={radiusKm * 1000} />

        {rows
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => (
            <Marker key={r.id} position={[Number(r.lat), Number(r.lng)] as any}>
              <Popup>
                <div className="space-y-1" style={{ minWidth: 180 }}>
                  <div className="font-medium">{r.title ?? 'Объявление'}</div>
                  <div className="text-xs text-muted-foreground">{r.city ?? ''}</div>
                  <div className="text-sm font-semibold">{money(Number(r.price) || 0)}</div>
                  <a className="underline text-sm" href={`/listings/${r.id}`}>Подробнее</a>
                </div>
              </Popup>
            </Marker>
          ))}
      </Map>
    </div>
  );
}
