'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function HeaderNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Flatback', exact: true },
    { href: '/catalog/products', label: 'Товары' },
    { href: '/catalog/services', label: 'Услуги' },
    { href: '/orders', label: 'Заказы' },
    { href: '/orders/create', label: 'Новый заказ' },

    { href: '/listings', label: 'Объявления' },
    { href: '/listings/create', label: 'Новое объявление' },
    { href: '/listings/my', label: 'Мои объявления' },

    { href: '/requests', label: 'Мои заявки' },
    { href: '/requests/incoming', label: 'Заявки на мои' },

    { href: '/favorites', label: 'Избранное' },
    // ВАЖНО: у нас роут /chat (без s), потому что внутренняя страница /chat/[id]
    { href: '/chat', label: 'Чаты' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
      <nav className="flex flex-wrap gap-3 text-sm">
        {items.map((it) => {
          const active = isActive(pathname, it.href, !!it.exact);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'px-2 py-1 rounded-md bg-neutral-100 font-medium'
                  : 'px-2 py-1 rounded-md hover:bg-neutral-50'
              }
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-2 py-1 border rounded">Войти</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-2 py-1 border rounded">Регистрация</button>
          </SignUpButton>
        </SignedOut>

        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
}
