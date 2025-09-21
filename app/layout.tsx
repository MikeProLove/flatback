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
            {/* ЕДИНСТВЕННОЕ меню */}
            <nav style={{ display: "flex", gap: 12 }}>
              <Link href="/">Flatback</Link>
              <Link href="/catalog/products">Товары</Link>
              <Link href="/catalog/services">Услуги</Link>
              <Link href="/orders">Заказы</Link>
              <Link href="/orders/create">Новый заказ</Link>
              <Link href="/listings">Объявления</Link>        {/* ← добавили */}
              <Link href="/listings/create">Новое объявление</Link>
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <SignedOut>
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </SignedOut>
              <SignedIn>
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
