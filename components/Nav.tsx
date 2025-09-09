"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

const links = [
  { href: "/", label: "Главная" },
  { href: "/dashboard", label: "Дашборд" },
  { href: "/properties", label: "Недвижимость" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-5xl mx-auto flex items-center gap-6 p-3">
        <Link href="/" className="font-bold">Flatback</Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href || pathname.startsWith(l.href + "/") ? "font-semibold" : ""}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link className="px-3 py-1 rounded bg-black text-white" href="/sign-in">Войти</Link>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}