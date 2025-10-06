// app/listings/map/page.tsx  (SERVER component)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import MapClient from './MapClient';

export default function Page() {
  return <MapClient />;
}
