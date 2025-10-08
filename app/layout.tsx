import type { Metadata } from 'next';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';

import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';

import MainNav from './(components)/MainNav';

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
            <MainNav />

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
