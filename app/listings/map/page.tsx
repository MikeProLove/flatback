'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadYMaps } from '@/lib/yamaps-loader';

type MarkerRow = {
  id: string;
  title: string;
  price: number;
  city: string;
  lat: number;
  lng: number;
};

function money(n: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${Math.round(n || 0)} ₽`;
  }
}

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [markers, setMarkers] = useState<MarkerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultCenter = useMemo<[number, number]>(() => [55.751244, 37.618423], []); // Москва [lat, lng]

  // 1) Грузим точки
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/listings/map', { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.message || 'Failed to load points');
        if (alive) setMarkers(j.rows || []);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Не удалось загрузить точки');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) Инициализация Яндекс.Карты и маркеров
  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        const ymaps3 = await loadYMaps();
        await ymaps3.ready;

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapControls, YMapZoomControl, YMapLayer } = ymaps3;

        if (!containerRef.current) return;

        // Создаём карту (Yandex v3 использует [lng, lat] в координатах!)
        const map = new YMap(containerRef.current, {
          location: {
            center: [defaultCenter[1], defaultCenter[0]], // [lng, lat]
            zoom: 11,
          },
          behaviors: ['drag', 'scrollZoom', 'dblClickZoom'],
        });

        mapRef.current = map;

        map.addChild(new YMapDefaultSchemeLayer());
        map.addChild(new YMapDefaultFeaturesLayer());
        const controls = new YMapControls({ position: 'right' });
        controls.addChild(new YMapZoomControl({}));
        map.addChild(controls);

        // Добавляем маркеры
        markers.forEach((m) => {
          const element = document.createElement('div');
          element.style.cssText =
            'transform: translate(-50%, -100%); background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.12); padding: 8px 10px; font-size: 12px; white-space: nowrap; cursor:pointer;';
          element.innerHTML = `<div style="font-weight:600; margin-bottom:2px">${money(m.price)}</div><div style="opacity:.7">${m.title}</div>`;
          element.onclick = () => (window.location.href = `/listings/${m.id}`);

          const marker = new ymaps3.YMapMarker(
            { coordinates: [m.lng, m.lat] }, // [lng, lat]
            element
          );
          map.addChild(marker);
        });

        // Фитним карту по точкам
        if (markers.length > 0) {
          const lats = markers.map((m) => m.lat);
          const lngs = markers.map((m) => m.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          // через bounds
          const bounds: [[number, number], [number, number]] = [
            [minLng, minLat],
            [maxLng, maxLat],
          ];
          // @ts-ignore
          map.setLocation({ bounds, duration: 300 });
        }

      } catch (e: any) {
        console.error('[yamap] init error', e);
        setError(e?.message || 'Ошибка инициализации карты');
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {}
        mapRef.current = null;
      }
    };
  }, [defaultCenter, markers]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Карта объявлений</h1>

      {error ? (
        <div className="rounded-2xl border p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '70vh',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #eee',
        }}
      />
    </div>
  );
}
