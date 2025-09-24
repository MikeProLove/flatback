import type { Metadata } from 'next';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flatback',
  description: 'Flatback app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body>
          <header className="flex items-center gap-4 px-4 py-3 border-b">
            {/* ОДИН nav c Link. Никаких вторых nav и <a> дубликатов */}
            <nav className="flex flex-wrap gap-4 text-sm">
              <Link href="/">Flatback</Link>
              <Link href="/catalog/products">Товары</Link>
              <Link href="/catalog/services">Услуги</Link>
              <Link href="/orders">Заказы</Link>
              <Link href="/orders/create">Новый заказ</Link>

              <Link href="/listings">Объявления</Link>
              <Link href="/listings/create">Новое объявление</Link>
              <Link href="/listings/my">Мои объявления</Link>
              <Link href="/requests">Мои заявки</Link>
              <Link href="/owner/requests">Заявки на мои</Link>
              <Link href="/favorites">Избранное</Link>
              <Link href="/chat">Чаты</Link>
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
          </header>

          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
