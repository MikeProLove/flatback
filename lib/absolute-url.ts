// Серверный хелпер: собирает абсолютный origin из заголовков
import { headers } from 'next/headers';

export function absoluteUrl(path: string) {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host =
    h.get('x-forwarded-host') ??
    h.get('host') ??
    'localhost:3000';

  const p = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${host}${p}`;
}

// Чтобы удобно прокидывать сессию в API
export function authHeaders() {
  const h = headers();
  const cookie = h.get('cookie') ?? '';
  return { cookie };
}
