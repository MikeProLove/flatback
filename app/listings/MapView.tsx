'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Listing = {
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

type Props = {
  initialCenter?: { lat: number; lng: number };
  initialRadiusKm?: number;
  filters?: Record<string, string>;
};

declare global {
  interface Window { L?: any }
}

function buildQS(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  return sp.toString();
}

export default function MapView({
  initialCenter = { lat: 55.751244, lng: 37.618423 },
  initialRadiusKm = 5,
  filters = {},
}: Props) {
  const mapRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [center, setCenter] = useState(initialCenter);
  const [radius, setRadius] = useState(initialRadiusKm);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

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
      if (!mapRef.current) {
        mapRef.current = L.map('map-root', { center: [initialCenter.lat, initialCenter.lng], zoom: 12 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        markersRef.current = L.layerGroup().addTo(mapRef.current);

        circleRef.current = L.circle([initialCenter.lat, initialCenter.lng], {
          radius: initialRadiusKm * 1000,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
        }).addTo(mapRef.current);

        mapRef.current.on('moveend', () => {
          const c = mapRef.current.getCenter();
          setCenter({ lat: c.lat, lng: c.lng });
        });
      }
      await loadData(center, radius);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.L || !circleRef.current) return;
    circleRef.current.setLatLng([center.lat, center.lng]);
    circleRef.current.setRadius(radius * 1000);
  }, [center, radius]);

  const queryFilters = useMemo(() => filters || {}, [filters]);

  async function loadData(c: { lat: number; lng: number }, rKm: number) {
    setLoading(true);
    try {
      const qs = buildQS({ lat: c.lat, lng: c.lng, radiusKm: rKm, ...queryFilters });
      const res = await fetch(`/api/listings/within?${qs}`, { cache: 'no-store' });
      const j = await res.json();
      const rows: Listing[] = j.rows || [];

      const L = window.L!;
      markersRef.current.clearLayers();

      rows.forEach((it) => {
        if (it.lat == null || it.lng == null) return;
        const m = L.marker([it.lat, it.lng]);

        // по клику сразу открываем объявление
        m.on('click', () => {
          window.location.href = `/listings/${it.id}`;
        });

        // лёгкая подсказка
        m.bindTooltip(it.title ?? 'Объявление', { direction: 'top', opacity: 0.9 });

        m.addTo(markersRef.current);
      });

      setCount(rows.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const searchHere = () => loadData(center, radius);

  const locate = () => {
    if (!navigator.geolocation) return alert('Геолокация недоступна');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        if (mapRef.current) mapRef.current.setView([c.lat, c.lng], 13);
        loadData(c, radius);
      },
      () => alert('Не удалось получить геопозицию')
    );
  };

  return (
    <div className="relative">
      <div id="map-root" className="h-[70vh] rounded-2xl border overflow-hidden z-0" />
      <div className="absolute top-3 right-3 z-[1001] pointer-events-none">
        <div className="rounded-xl border bg-white/90 backdrop-blur px-3 py-2 text-sm shadow pointer-events-auto">
          <div className="flex items-center gap-2">
            <span>Радиус:</span>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <span className="w-10 text-right">{radius} км</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={searchHere} className="px-3 py-1 border rounded-md">
              Искать здесь
            </button>
            <button onClick={locate} className="px-3 py-1 border rounded-md">
              Моя гео
            </button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {loading ? 'Загрузка…' : `Найдено: ${count}`}
          </div>
        </div>
      </div>
    </div>
  );
}
