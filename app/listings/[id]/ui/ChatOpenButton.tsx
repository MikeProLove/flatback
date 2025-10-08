'use client';

import { useState } from 'react';

export default function ChatOpenButton({ ownerId, listingId }: { ownerId: string; listingId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          setLoading(true);
          const r = await fetch('/api/chats/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerId, listingId }),
          });
          const j = await r.json();
          if (r.ok && j?.id) {
            location.href = `/chat/${j.id}`;
          } else {
            alert(j?.error || 'Не удалось открыть чат');
          }
        } finally {
          setLoading(false);
        }
      }}
      className="w-full px-3 py-2 border rounded-md text-sm"
      disabled={loading}
    >
      {loading ? 'Открываем…' : 'Открыть чат с владельцем'}
    </button>
  );
}
