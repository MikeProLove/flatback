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
import { useEffect, useState } from 'react';

type Item = { href: string; label: string; match?: 'exact' | 'startsWith' };

const NAV: Item[] = [
  { href: '/', label: 'Flatback', match: 'exact' },
  { href: '/catalog/products', label: 'Товары' },
  { href: '/catalog/services', label: 'Услуги' },
  { href: '/orders', label: 'Заказы', match: 'startsWith' },
  { href: '/orders/create', label: 'Новый заказ', match: 'startsWith' },

  { href: '/listings', label: 'Объявления', match: 'startsWith' },
  { href: '/listings/create', label: 'Новое объявление' },
  { href: '/listings/my', label: 'Мои объявления' },

  { href: '/requests', label: 'Мои заявки', match: 'startsWith' },
  { href: '/requests/incoming', label: 'Заявки на мои', match: 'startsWith' },

  { href: '/favorites', label: 'Избранное' },
  { href: '/chat', label: 'Чаты', match: 'startsWith' },
];

function isActive(pathname: string, item: Item) {
  if (item.match === 'exact') return pathname === item.href;
  if (item.match === 'startsWith') return pathname.startsWith(item.href);
  return pathname === item.href;
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // закрывать меню при навигации
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b">
      {/* Бургер на мобильных */}
      <button
        onClick={() => setOpen(v => !v)}
        className="md:hidden inline-flex items-center justify-center rounded-md border px-2 py-1"
        aria-label="Меню"
      >
        {/* простая иконка */}
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Десктоп-меню */}
      <nav className="hidden md:flex flex-wrap gap-4 text-sm">
        {NAV.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={isActive(pathname, i) ? 'underline font-medium' : ''}
          >
            {i.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
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

      {/* Мобильное полноэкранное меню (оверлей) */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[340px] bg-white shadow-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Навигация</div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-md border px-2 py-1"
                aria-label="Закрыть"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto text-base">
              {NAV.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className={
                    'block rounded-md px-3 py-2 ' +
                    (isActive(pathname, i) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50')
                  }
                >
                  {i.label}
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t mt-3">
              <SignedOut>
                <div className="flex gap-2">
                  <SignInButton mode="modal">
                    <button className="px-3 py-2 border rounded-md w-full">Войти</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-3 py-2 border rounded-md w-full">Регистрация</button>
                  </SignUpButton>
                </div>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
