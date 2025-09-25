'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function FavoriteButton({
  listingId,
  initial = false,
}: {
  listingId: string;
  initial?: boolean;
}) {
  const [on, setOn] = useState(!!initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'PATCH', // совместимо и с POST — см. API
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || res.statusText);
      setOn(!!j.favorited);
    } catch {
      alert('Не удалось изменить избранное');
    } finally {
      setBusy(false);
    }
  }

  const Heart = ({ filled }: { filled: boolean }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M12 21s-6.7-4.3-9.4-7C.9 12.3.5 10.6.5 9.5.5 6.5 3 4 6 4c1.7 0 3.2.8 4.1 2.1C11.8 4.8 13.3 4 15 4c3 0 5.5 2.5 5.5 5.5 0 1.1-.4 2.8-2.1 4.5C18.7 16.7 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
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
      {children}
    </button>
  );

  return (
    <div className="relative z-10">
      <SignedOut>
        <SignInButton mode="modal">
          <Circle>
            <Heart filled={false} />
          </Circle>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <Circle onClick={toggle}>
          <span className={on ? 'text-red-500' : 'text-gray-700'}>
            <Heart filled={on} />
          </span>
        </Circle>
      </SignedIn>
    </div>
  );
}
