// lib/geocode.ts
export async function geocodeAddress(address?: string | null, city?: string | null) {
  const q = [address, city].filter(Boolean).join(', ').trim();
  if (!q) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'flatback/1.0 (admin@flatback.ru)' },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const arr = (await res.json()) as any[];
  if (!arr?.[0]) return null;

  const lat = Number(arr[0].lat);
  const lng = Number(arr[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}
