'use client';

import { useState } from 'react';

export default function ChatOpenButton({
  ownerId,
  listingId,
  className,
}: {
  ownerId: string;
  listingId: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        try {
          setLoading(true);
          const r = await fetch('/api/chats/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerId, listingId }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error || 'Не удалось открыть чат');
          location.href = `/chat/${j.id}`;
        } catch (e: any) {
          alert(e?.message || 'Ошибка');
        } finally {
          setLoading(false);
        }
      }}
      className={className ?? 'w-full px-3 py-2 border rounded-md text-sm'}
      disabled={loading}
    >
      {loading ? 'Открываем…' : 'Открыть чат с владельцем'}
    </button>
  );
}
