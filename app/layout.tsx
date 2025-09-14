'use client';

import {
  ClerkProvider,
  SignInButton,
  UserButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';
import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="ru">
        <body>
          <header className="p-3 border-b flex items-center gap-4">
            <Link href="/" className="font-semibold">Flatback</Link>

            <nav className="flex gap-3">
              <Link href="/catalog/products">Товары</Link>
              <Link href="/catalog/services">Услуги</Link>
              <Link href="/orders/create">Новый заказ</Link>
            </nav>

            <div className="ml-auto flex items-center gap-3">
              {/* Явная текстовая ссылка — чтобы точно увидеть кнопку даже без Clerk */}
              <Link href="/sign-in" className="underline">Войти (fallback)</Link>

              {/* Кнопки Clerk */}
              <SignedOut>
                <SignInButton mode="modal" />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
