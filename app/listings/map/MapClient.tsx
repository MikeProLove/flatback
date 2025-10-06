'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, LngLatBoundsLike, GeoJSONSource } from 'maplibre-gl';

type MarkerRow = {
  id: string;
  title: string | null;
  price: number | null;
  city: string | null;
  lat: number;
  lng: number;
  cover_url?: string | null;
};

function money(n: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
      .format(n || 0);
  } catch { return `${Math.round(n || 0)} ₽`; }
}

function toGeoJSON(rows: MarkerRow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      properties: {
        id: r.id,
        title: r.title ?? 'Объявление',
        price: r.price ?? 0,
        city: r.city ?? '',
        cover_url: r.cover_url || null,
      },
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
    })),
  };
}

export default function MapClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  const [rows, setRows] = useState<MarkerRow[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Москва [lng, lat]
  const center = useMemo<[number, number]>(() => [37.618423, 55.751244], []);

  // подгружаем публичный ключ и точки
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cfg, pts] = await Promise.all([
          fetch('/api/public-config', { cache: 'no-store' }).then(r => r.json()),
          fetch('/api/listings/map', { cache: 'no-store' }).then(r => r.json()),
        ]);
        if (!alive) return;
        if (!cfg?.maptilerKey) {
          setError('NEXT_PUBLIC_MAPTILER_KEY не задан.');
        } else {
          setApiKey(cfg.maptilerKey);
        }
        setRows(pts?.rows ?? []);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Не удалось загрузить данные карты');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // инициализируем карту, когда есть ключ
  useEffect(() => {
    if (!apiKey) return;
    if (!containerRef.current) return;

    const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom: 11,
      attributionControl: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('listings', {
        type: 'geojson',
        data: toGeoJSON(rows),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'listings',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#9DD6FF', 20,
            '#53B1FD', 50,
            '#2E90FA'
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            16, 20, 22, 50, 28
          ],
          'circle-opacity': 0.9
        }
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'listings',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count'],
          'text-size': 12
        },
        paint: { 'text-color': '#003366' }
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'listings',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#ffffff',
          'circle-stroke-color': '#1E40AF',
          'circle-stroke-width': 2,
          'circle-radius': 7
        }
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource('listings') as GeoJSONSource;
        if (!source || clusterId == null) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const { coordinates } = features[0].geometry as any;
          map.easeTo({ center: coordinates, zoom });
        });
      });

      map.on('click', 'unclustered-point', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })?.[0];
        if (!f) return;
        const p = f.properties as any;
        const coords = (f.geometry as any).coordinates as [number, number];

        const html = `
          <div style="max-width:220px;">
            ${p.cover_url ? `<img src="${p.cover_url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>` : ''}
            <div style="font-weight:600;margin-bottom:4px">${p.title || 'Объявление'}</div>
            <div style="font-size:12px;color:#666;margin-bottom:6px">${p.city || ''}</div>
            <div style="font-weight:600;margin-bottom:8px">${money(Number(p.price)||0)}</div>
            <a href="/listings/${p.id}" style="display:inline-block;padding:6px 10px;border:1px solid #ddd;border-radius:8px;text-decoration:none">Открыть</a>
          </div>
        `;

        new maplibregl.Popup({ closeButton: true, offset: 12 })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      ['clusters', 'unclustered-point'].forEach((layer) => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      });

      if (rows.length) {
        const lats = rows.map((r) => r.lat);
        const lngs = rows.map((r) => r.lng);
        const bounds: LngLatBoundsLike = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
        map.fitBounds(bounds, { padding: 40, duration: 400 });
      }
    });

    return () => { try { map.remove(); } catch {} mapRef.current = null; };
  }, [apiKey, center, rows]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Карта объявлений</h1>
      {error && <div className="rounded-2xl border p-3 text-sm text-red-600 mb-3">{error}</div>}
      {loading && <div className="rounded-2xl border p-3 text-sm text-muted-foreground mb-3">Загружаем точки…</div>}

      <div
        ref={containerRef}
        style={{ width: '100%', height: '70vh', borderRadius: 16, overflow: 'hidden', border: '1px solid #eee' }}
      />
    </div>
  );
}
