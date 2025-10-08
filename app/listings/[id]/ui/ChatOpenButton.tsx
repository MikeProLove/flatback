'use client';

import { useState } from 'react';

export default function ChatOpenButton({ ownerId, listingId }: { ownerId: string; listingId: string }) {
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
          if (r.status === 401) {
            alert('Нужно войти, чтобы написать владельцу.');
            return;
          }
          const j = await r.json();
          if (!r.ok || !j?.id) {
            alert(j?.error || 'Не удалось открыть чат');
            return;
          }
          location.href = `/chat/${j.id}`;
        } finally {
          setLoading(false);
        }
      }}
      className="w-full px-3 py-2 border rounded-md text-sm hover:bg-muted disabled:opacity-60"
      disabled={loading}
    >
      {loading ? 'Открываем…' : 'Открыть чат с владельцем'}
    </button>
  );
}
