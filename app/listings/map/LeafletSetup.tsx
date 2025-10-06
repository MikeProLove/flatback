'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// фиксим пути к иконкам, чтобы маркеры были видны в Next.js
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: (iconRetinaUrl as unknown as string),
  iconUrl: (iconUrl as unknown as string),
  shadowUrl: (shadowUrl as unknown as string),
});

export default function LeafletSetup() {
  return null; // просто побочный эффект: css + иконки
}
