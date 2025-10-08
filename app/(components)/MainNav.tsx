'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
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
  { href: '/chat', label: 'Чаты' },
];

export default function MainNav() {
  const pathname = usePathname() || '/';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="flex flex-wrap gap-4 text-sm">
      <Link href="/">Flatback</Link>

      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={
            'px-1 ' +
            (isActive(i.href)
              ? 'text-foreground font-semibold border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
