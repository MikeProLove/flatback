'use client';

import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function FavoriteButton({ listingId }: { listingId: string }) {
  const [fav, setFav] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/favorites/${listingId}`, { cache: 'no-store' });
        const j = await res.json();
        if (alive) setFav(Boolean(j.isFavorite));
      } catch {
        if (alive) setFav(false);
      }
    })();
    return () => { alive = false; };
  }, [listingId]);

  const toggle = async () => {
    if (fav === null || busy) return;
    setBusy(true);
    try {
      const method = fav ? 'DELETE' : 'POST';
      const res = await fetch(`/api/favorites/${listingId}`, { method });
      if (res.ok) setFav(!fav);
    } finally {
      setBusy(false);
    }
  };

  // простая иконка сердечка SVG
  const Heart = ({ filled }: { filled: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-6.716-4.35-9.428-7.06C.86 12.23.5 10.26 1.4 8.7 2.44 6.89 4.78 6.17 6.7 7.05 8.06 7.68 9 8.9 12 11.5c3-2.6 3.94-3.82 5.3-4.45 1.92-.88 4.26-.16 5.3 1.65.9 1.56.54 3.53-1.17 5.24C18.716 16.65 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );

  return (
    <div className="relative">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            aria-label="В избранное"
            className="absolute top-2 right-2 rounded-full bg-white/85 hover:bg-white p-1 shadow"
          >
            <Heart filled={false} />
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <button
          onClick={toggle}
          disabled={fav === null || busy}
          aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
          className="absolute top-2 right-2 rounded-full bg-white/85 hover:bg-white p-1 shadow"
        >
          <Heart filled={!!fav} />
        </button>
      </SignedIn>
    </div>
  );
}
