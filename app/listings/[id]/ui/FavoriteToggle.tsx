'use client';

import { useState, useTransition } from 'react';

export default function FavoriteToggle({
  listingId,
  initial,
}: {
  listingId: string;
  initial: boolean;
}) {
  const [fav, setFav] = useState(!!initial);
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          try {
            const res = await fetch('/api/favorites/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listing_id: listingId }),
            });
            if (!res.ok) throw new Error('fail');
            setFav((v) => !v);
          } catch {
            alert('Не удалось изменить избранное');
          }
        })
      }
      aria-pressed={fav}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
        fav ? 'text-red-500 border-red-200 bg-red-50' : 'text-gray-500'
      } ${pending ? 'opacity-60 pointer-events-none' : ''}`}
      title={fav ? 'Убрать из избранного' : 'В избранное'}
    >
      {/* аккуратное сердечко */}
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fav ? 'currentColor' : 'none'} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.94 0-3.602 1.14-4.312 2.773C11.29 4.89 9.628 3.75 7.688 3.75 5.099 3.75 3 5.765 3 8.25c0 7.125 9 11.25 9 11.25s9-4.125 9-11.25z"
        />
      </svg>
    </button>
  );
}
