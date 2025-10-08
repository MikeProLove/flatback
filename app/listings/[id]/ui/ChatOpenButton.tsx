'use client';

import { useState } from 'react';

export default function ChatOpenButton({ ownerId, listingId }: { ownerId: string; listingId?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/chats/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerId, listingId }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.id) {
            alert(json?.message || json?.error || 'Не удалось открыть чат');
            return;
          }
          location.href = `/chat/${json.id}`;
        } finally {
          setLoading(false);
        }
      }}
      className="w-full px-4 py-2 border rounded-md text-sm"
    >
      {loading ? 'Открываем…' : 'Открыть чат с владельцем'}
    </button>
  );
}
