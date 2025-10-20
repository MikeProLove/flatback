'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { href: string; label: string; icon: React.ReactNode; match?: 'startsWith'|'exact' };

const TABS: Tab[] = [
  { href: '/listings', label: 'Объявл.', icon: <HomeIcon/>, match: 'startsWith' },
  { href: '/favorites', label: 'Избран.', icon: <HeartIcon/> },
  { href: '/requests', label: 'Заявки', icon: <TicketIcon/>, match: 'startsWith' },
  { href: '/chat', label: 'Чаты', icon: <ChatIcon/>, match: 'startsWith' },
];

function isActive(pathname: string, t: Tab) {
  if (t.match === 'startsWith') return pathname.startsWith(t.href);
  if (t.match === 'exact') return pathname === t.href;
  return pathname === t.href;
}

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white">
      <nav className="grid grid-cols-4">
        {TABS.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                'flex flex-col items-center justify-center py-2 text-xs ' +
                (active ? 'text-blue-600 font-medium' : 'text-gray-700')
              }
            >
              <div className="h-5">{t.icon}</div>
              <div>{t.label}</div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* Простые инлайн-иконки (без внешних зависимостей) */
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 10.5l9-7 9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 7h18v4a2 2 0 1 0 0 4v4H3v-4a2 2 0 1 0 0-4V7z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5h16v10H7l-3 3V5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
