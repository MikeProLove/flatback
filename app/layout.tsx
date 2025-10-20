// app/layout.tsx
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';

import SiteHeader from './_components/SiteHeader';
import MobileTabBar from './_components/MobileTabBar';

export const metadata: Metadata = {
  title: 'Flatback',
  description: 'Flatback app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body>
          {/* Шапка с бургер-меню и подсветкой активного пункта */}
          <SiteHeader />

          {/* Отступ снизу под фиксированный таббар на мобилках */}
          <main className="pb-16 md:pb-0">{children}</main>

          {/* Нижняя навигация: видна только на мобильных */}
          <MobileTabBar />
        </body>
      </html>
    </ClerkProvider>
  );
}
