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
  const [on, setOn] = useState<boolean>(!!initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
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
    } catch (e) {
      alert('Не удалось изменить избранное');
    } finally {
      setBusy(false);
    }
  };

  const Heart = ({ filled }: { filled: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21s-6.716-4.297-9.428-7.009C.86 12.28.5 10.6.5 9.5.5 6.462 2.962 4 6 4c1.657 0 3.156.81 4.1 2.05C11.844 4.81 13.343 4 15 4c3.038 0 5.5 2.462 5.5 5.5 0 1.1-.36 2.78-2.072 4.491C18.716 16.703 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );

  const Btn = ({ children, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-10 h-10 rounded-full bg-white/95 border shadow flex items-center justify-center hover:shadow-md focus:outline-none"
      aria-label={on ? 'Убрать из избранного' : 'В избранное'}
      title={on ? 'Убрать из избранного' : 'В избранное'}
      style={{ lineHeight: 0 }}
    >
      {children}
    </button>
  );

  return (
    <div className="relative z-10">
      <SignedOut>
        <SignInButton mode="modal">
          <Btn>
            <Heart filled={false} />
          </Btn>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <Btn onClick={toggle}>
          <span className={on ? 'text-red-500' : 'text-gray-700'}>
            <Heart filled={on} />
          </span>
        </Btn>
      </SignedIn>
    </div>
  );
}
