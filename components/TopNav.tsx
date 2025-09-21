// components/TopNav.tsx
'use client';

import Link from 'next/link';

export default function TopNav() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold">Flatback</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/catalog/products" className="hover:underline">Товары</Link>
          <Link href="/catalog/services" className="hover:underline">Услуги</Link>
          <Link href="/orders" className="hover:underline">Заказы</Link>
          <Link href="/orders/create" className="hover:underline">Новый заказ</Link>
        </nav>
      </div>
    </header>
  );
}
