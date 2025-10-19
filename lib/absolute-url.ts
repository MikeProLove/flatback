// lib/absolute-url.ts
import { headers as nextHeaders } from 'next/headers';

function readHeaders():
  | { get(name: string): string | null }
  | null {
  try {
    return nextHeaders();
  } catch {
    return null;
  }
}

export function getBaseUrl(): string {
  const h = readHeaders();

  const protoFromHeaders =
    h?.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    '';

  const vercelUrl = process.env.VERCEL_URL || '';

  const hostFromHeaders =
    h?.get('x-forwarded-host') ??
    h?.get('host') ??
    '';

  let base =
    (siteUrl && siteUrl.startsWith('http') ? siteUrl : '') ||
    (hostFromHeaders ? `${protoFromHeaders}://${hostFromHeaders}` : '') ||
    (vercelUrl ? `${protoFromHeaders}://${vercelUrl}` : '') ||
    'http://localhost:3000';

  if (base.endsWith('/')) base = base.slice(0, -1);
  return base;
}

export function absoluteUrl(path = '/'): string {
  const base = getBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Собираем заголовки для server-fetch: подмешиваем cookie текущей сессии
 * и аккуратно мерджим произвольный HeadersInit.
 */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const h = readHeaders();
  const cookie = h?.get('cookie') ?? '';

  const out: Record<string, string> = {};
  if (cookie) out['cookie'] = cookie;

  if (!extra) return out;

  // 1) Headers
  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }

  // 2) Array<[string, string]>
  if (Array.isArray(extra)) {
    for (const [k, v] of extra) {
      out[k.toLowerCase()] = String(v);
    }
    return out;
  }

  // 3) Record<string, string | string[]>
  const obj = extra as Record<string, string | string[]>;
  for (const [k, v] of Object.entries(obj)) {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
}
