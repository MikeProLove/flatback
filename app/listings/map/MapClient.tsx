'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';

type Item = {
  id: string;
  title: string | null;
  lat: number | null;
  lng: number | null;
  price: number | null;
  cover_url?: string | null;
};

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}
function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function MapClient({ items }: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 1) берём ключ
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/public-config', { cache: 'no-store' });
        const j = await r.json();
        if (!alive) return;
        if (!j?.maptilerKey) setErr('NEXT_PUBLIC_MAPTILER_KEY не задан.');
        setApiKey(j?.maptilerKey || null);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Не удалось получить ключ');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) инициализируем карту, когда есть ключ
  useEffect(() => {
    if (!apiKey) return;
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      center: [37.618423, 55.751244], // Москва по умолчанию
      zoom: 10,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    // маркеры
    const bounds = new maplibregl.LngLatBounds();
    let haveAny = false;

    (items ?? []).forEach((it) => {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;
      haveAny = true;

      const m = new maplibregl.Marker({ color: '#2563eb' }) // синий маркер
        .setLngLat([Number(it.lng), Number(it.lat)]);

      const html =
        `<div style="max-width:220px">
          ${it.cover_url ? `<img src="${esc(it.cover_url!)}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : ''}
          <div style="font-weight:600;margin-bottom:4px">${esc(it.title ?? 'Объявление')}</div>
          <div style="color:#334155;margin-bottom:8px">${money(it.price)}</div>
          <a href="/listings/${esc(it.id)}" style="text-decoration:underline">Открыть</a>
        </div>`;

      const popup = new maplibregl.Popup({ offset: 14 }).setHTML(html);
      m.setPopup(popup).addTo(map);

      bounds.extend([Number(it.lng), Number(it.lat)]);
    });

    if (haveAny) {
      try {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 600 });
      } catch {
        /* ignore */
      }
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [apiKey, items]);

  if (err) return <div className="rounded-2xl border p-4 text-red-600">{err}</div>;
  if (!apiKey) return <div className="rounded-2xl border p-4 text-sm text-muted-foreground">Загружаем карту…</div>;

  return (
    <div ref={containerRef} className="h-[70vh] w-full rounded-2xl overflow-hidden" />
  );
}
