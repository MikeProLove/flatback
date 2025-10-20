// lib/absolute-url.ts
import { headers } from 'next/headers';

/** Построить абсолютный URL для серверного рендера/роутов */
export function absoluteUrl(path: string): string {
  const h = headers();
  const xfProto = h.get('x-forwarded-proto');
  const xfHost = h.get('x-forwarded-host');
  const hostHdr = h.get('host');

  let protocol = xfProto || 'https';
  let host = xfHost || hostHdr || '';

  // Vercel: VERCEL_URL без протокола
  if (!host) {
    const vercel = process.env.VERCEL_URL;
    if (vercel) host = vercel;
  }

  // Явный бэкап на NEXT_PUBLIC_SITE_URL (с протоколом)
  if (!host && process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      const u = new URL(process.env.NEXT_PUBLIC_SITE_URL);
      protocol = u.protocol.replace(':', '') || protocol;
      host = u.host;
    } catch {}
  }

  // Dev/local по умолчанию
  if (!host) {
    host = 'localhost:3000';
    protocol = 'http';
  }

  // Локалхост — всегда http
  if (host.includes('localhost') || /^[\d.]+:\d+$/.test(host)) {
    protocol = 'http';
  }

  const p = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}://${host}${p}`;
}

/** Серверный fetch, который прокидывает cookie (сеанс Clerk) в API */
export async function serverFetch(path: string, init?: RequestInit) {
  const url = absoluteUrl(path);
  const h = headers();
  const cookie = h.get('cookie');

  const merged = new Headers(init?.headers as HeadersInit | undefined);
  if (cookie && !merged.has('cookie')) merged.set('cookie', cookie);

  return fetch(url, {
    ...init,
    headers: merged,
    cache: init?.cache ?? 'no-store',
  });
}

/** Если где-то нужно просто отдать заголовок cookie в init */
export function authHeaders(): Record<string, string> {
  const cookie = headers().get('cookie') ?? '';
  return cookie ? { cookie } : {};
}
