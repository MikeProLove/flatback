// app/layout.tsx
import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flatback",
  description: "Flatback app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "10px 16px",
              borderBottom: "1px solid #eee",
            }}
          >
            <nav style={{ display: "flex", gap: 12 }}>
              <Link href="/">Flatback</Link>
              <Link href="/catalog/products">Товары</Link>
              <Link href="/catalog/services">Услуги</Link>
              <Link href="/orders/create">Новый заказ</Link>
            </nav>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/catalog/products" className="hover:underline">Товары</a>
              <a href="/catalog/services" className="hover:underline">Услуги</a>
              <a href="/orders" className="hover:underline">Заказы</a>       {/* ⬅️ добавили */}
              <a href="/orders/create" className="hover:underline">Новый заказ</a>
            </nav>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <SignedOut>
                {/* Кнопки аутентификации Clerk (модалка, без отдельных маршрутов) */}
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </SignedOut>

              <SignedIn>
                {/* Кнопка аккаунта с меню */}
                <UserButton />
              </SignedIn>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
