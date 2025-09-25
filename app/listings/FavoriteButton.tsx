'use client';
import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function FavoriteButton({
  listingId,
  initial = false,
}: { listingId: string; initial?: boolean }) {
  const [on, setOn] = useState(!!initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || res.statusText);
      setOn(!!j.favorited);
    } catch (e: any) {
      alert(e?.message || 'Не удалось изменить избранное');
    } finally {
      setBusy(false);
    }
  }

  // Аккуратное "полное" сердечко, без перекосов
  const Heart = ({ filled }: { filled: boolean }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.55C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );

  const Circle = ({ children, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-10 h-10 rounded-full bg-white/95 border shadow flex items-center justify-center hover:shadow-md focus:outline-none"
      style={{ lineHeight: 0 }}
      aria-label={on ? 'Убрать из избранного' : 'В избранное'}
      title={on ? 'Убрать из избранного' : 'В избранное'}
    >
      <span className={on ? 'text-red-500' : 'text-gray-700'}>{children}</span>
    </button>
  );

  return (
    <div className="relative z-10">
      <SignedOut>
        <SignInButton mode="modal">
          <Circle><Heart filled={false} /></Circle>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Circle onClick={toggle}><Heart filled={on} /></Circle>
      </SignedIn>
    </div>
  );
}
