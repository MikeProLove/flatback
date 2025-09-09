import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Flatback",
  description: "MVP: Next + TypeScript + Supabase + Clerk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body className="min-h-screen bg-gray-50">
          <Nav />
          <main className="max-w-5xl mx-auto p-4">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}