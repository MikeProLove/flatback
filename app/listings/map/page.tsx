// app/listings/map/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import MapClient from './MapClient';

export default function ListingsMapPage() {
  // Вся логика — на клиенте (MapClient), тут просто заголовок и контейнер
  return <MapClient />;
}
