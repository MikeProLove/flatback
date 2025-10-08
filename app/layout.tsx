// app/layout.tsx
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';

import HeaderNav from './(components)/HeaderNav';

export const metadata: Metadata = {
  title: 'Flatback',
  description: 'Flatback app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body>
          <header className="border-b">
            <HeaderNav />
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
