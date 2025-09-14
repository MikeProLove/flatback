// app/layout.tsx
'use client';

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/nextjs';
import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
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
              {/* Явная fallback-ссылка — полезна при отладке */}
              <Link href="/sign-in" className="underline">Войти (страница)</Link>

              {/* Кнопка Clerk — используем редирект, не модалку */}
              <SignedOut>
                <SignInButton mode="redirect" redirectUrl="/sign-in" />
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
