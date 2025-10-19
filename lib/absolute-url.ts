// lib/absolute-url.ts
import { headers, cookies } from 'next/headers';

/** Собрать абсолютный URL при необходимости (оставляем — вдруг ещё пригодится) */
export function absoluteUrl(path: string) {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${host}${p}`;
}

/** Сформировать заголовок cookie для серверного fetch */
export function authHeaders(): HeadersInit {
  const cookie = cookies().toString(); // name=value; name2=value2
  return cookie ? { cookie } : {};
}

/** Удобный серверный вызов API: всегда без кеша и с прокидкой cookie */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('/') ? path : `/${path}`; // используем ОТНОСИТЕЛЬНЫЙ путь!
  const h = new Headers(init.headers as HeadersInit | undefined);
  for (const [k, v] of Object.entries(authHeaders())) h.set(k, v as string);

  return fetch(url, {
    ...init,
    headers: h,
    cache: 'no-store',
    // на сервере credentials не влияют, но пускай будет для симметрии
    credentials: 'include',
  });
}
