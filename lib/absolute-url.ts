// lib/absolute-url.ts
import { headers as nextHeaders } from 'next/headers';

/**
 * Пытаемся прочитать заголовки запроса.
 * Если вызов вне контекста запроса (cron/скрипт/серверный импорт) — вернём null
 * и ниже переключимся на фолбэк через ENV.
 */
function readHeaders():
  | { get(name: string): string | null }
  | null {
  try {
    return nextHeaders();
  } catch {
    return null;
  }
}

/**
 * Базовый URL приложения.
 * Приоритеты:
 * 1) x-forwarded-proto/host (Vercel/прокси)
 * 2) host (локально)
 * 3) NEXT_PUBLIC_SITE_URL (например: https://flatback.ru)
 * 4) VERCEL_URL (домен превью без протокола)
 * 5) http://localhost:3000
 */
export function getBaseUrl(): string {
  const h = readHeaders();

  const protoFromHeaders =
    h?.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  // Если в ENV уже указан полный URL с протоколом — используем как есть.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    '';

  // Vercel даёт домен без протокола (например, my-app.vercel.app)
  const vercelUrl = process.env.VERCEL_URL || '';

  // 1) Из заголовков
  const hostFromHeaders =
    h?.get('x-forwarded-host') ??
    h?.get('host') ??
    '';

  // Собираем итоговый host + протокол
  let base =
    (siteUrl && siteUrl.startsWith('http')
      ? siteUrl
      : '') ||
    (hostFromHeaders
      ? `${protoFromHeaders}://${hostFromHeaders}`
      : '') ||
    (vercelUrl
      ? `${protoFromHeaders}://${vercelUrl}`
      : '') ||
    'http://localhost:3000';

  // Уберём возможный завершающий слэш
  if (base.endsWith('/')) base = base.slice(0, -1);

  return base;
}

/**
 * Абсолютный URL на основе текущего запроса либо ENV.
 * guaranteed: всегда вернёт корректный абсолютный адрес.
 */
export function absoluteUrl(path = '/'): string {
  const base = getBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Заголовки авторизации для server-fetch.
 * Подмешивает cookie текущего запроса (нужно для Clerk/SSR,
 * чтобы API-роут видел сессию пользователя).
 *
 * Пример:
 *   fetch(absoluteUrl('/api/requests/mine'), {
 *     cache: 'no-store',
 *     headers: authHeaders({ 'content-type': 'application/json' }),
 *   })
 */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const h = readHeaders();
  const cookie = h?.get('cookie') ?? '';

  // Нормализуем в объект для удобства мерджа
  const out: Record<string, string> = {};

  if (cookie) out['cookie'] = cookie;

  // Смерджим переданные заголовки (если были)
  if (extra) {
    if (Array.isArray(extra)) {
      for (const [k, v] of extra) out[k.toLowerCase()] = v as string;
    } else if (extra instanceof Headers) {
      extra.forEach((v, k) => (out[k.toLowerCase()] = v));
    } else {
      for (const k of Object.keys(extra)) {
        // @ts-expect-error — HeadersInit допускает разные формы
        out[k.toLowerCase()] = extra[k];
      }
    }
  }

  return out;
}
