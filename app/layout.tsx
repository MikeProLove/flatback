// app/layout.tsx
'use client';

import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="p-3 border-b flex items-center gap-4">
          <Link href="/" className="font-semibold">Flatback</Link>
          <nav className="flex gap-3 ml-auto">
            <Link href="/catalog/products">Товары</Link>
            <Link href="/catalog/services">Услуги</Link>
            <Link href="/orders/create">Новый заказ</Link>
            <Link href="/sign-in" className="underline">Войти (страница)</Link>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
