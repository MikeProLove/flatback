'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  /** начальные координаты (если уже есть) */
  initialLat?: number | null;
  initialLng?: number | null;
  /** id скрытых инпутов, чтобы писать туда значение для сабмита формы */
  latInputId: string;
  lngInputId: string;
};

declare global {
  interface Window { L?: any }
}

export default function MapPicker({ initialLat = null, initialLng = null, latInputId, lngInputId }: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // загрузка Leaflet с CDN один раз
  useEffect(() => {
    const ensureLeaflet = async () => {
      if (window.L) return;
      await new Promise<void>((res) => {
        const cssId = 'leaflet-css';
        if (!document.getElementById(cssId)) {
          const link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        const scriptId = 'leaflet-js';
        if (document.getElementById(scriptId)) { res(); return; }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => res();
        document.body.appendChild(script);
      });
    };

    (async () => {
      await ensureLeaflet();
      const L = window.L!;
      const start = [
        initialLat ?? 55.751244, // Москва
        initialLng ?? 37.618423,
      ] as [number, number];

      if (!mapRef.current) {
        mapRef.current = L.map('map-picker', { center: start, zoom: initialLat && initialLng ? 14 : 12 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        // кликом по карте ставим маркер
        mapRef.current.on('click', (e: any) => {
          placeMarker(e.latlng.lat, e.latlng.lng);
        });
      }

      // если есть начальные координаты — поставим маркер
      if (initialLat && initialLng) {
        placeMarker(initialLat, initialLng);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(lat: number, lng: number) {
    const L = window.L!;
    if (!mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', (e: any) => {
        const p = e.target.getLatLng();
        writeInputs(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    mapRef.current.setView([lat, lng], 14);
    writeInputs(lat, lng);
  }

  function writeInputs(lat: number, lng: number) {
    const latEl = document.getElementById(latInputId) as HTMLInputElement | null;
    const lngEl = document.getElementById(lngInputId) as HTMLInputElement | null;
    if (latEl) latEl.value = String(lat);
    if (lngEl) lngEl.value = String(lng);
  }

  async function geocode() {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    try {
      // простой геокодер OSM Nominatim
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('q', q);
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      const arr = await res.json();
      if (Array.isArray(arr) && arr[0]) {
        const lat = Number(arr[0].lat);
        const lon = Number(arr[0].lon);
        placeMarker(lat, lon);
      } else {
        alert('Ничего не найдено. Уточните адрес.');
      }
    } catch {
      alert('Не удалось выполнить поиск. Поставьте точку кликом на карте.');
    } finally {
      setBusy(false);
    }
  }

  const clearPoint = () => {
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    writeInputs(NaN as any, NaN as any);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Адрес, метро, ориентир"
          className="flex-1 border rounded-md px-3 py-2"
        />
        <button
          type="button"
          onClick={geocode}
          disabled={busy}
          className="px-3 py-2 border rounded-md"
        >
          {busy ? 'Ищем…' : 'Найти'}
        </button>
        <button type="button" onClick={clearPoint} className="px-3 py-2 border rounded-md">
          Очистить
        </button>
      </div>

      <div id="map-picker" className="h-[320px] rounded-2xl border overflow-hidden" />
      <div className="text-xs text-muted-foreground">
        Кликните по карте, чтобы поставить точку. Маркер можно перетаскивать.
      </div>
    </div>
  );
}
