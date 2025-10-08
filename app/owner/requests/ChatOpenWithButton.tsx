'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatOpenWithButton({
  listingId,
  otherUserId,
  label = 'Открыть чат',
}: {
  listingId: string;
  otherUserId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <button
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/chats/open-with', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId, otherUserId }),
          });
          const j = await res.json();
          if (!res.ok) {
            alert(j?.message || j?.error || 'Не удалось открыть чат');
            return;
          }
          router.push(`/chat/${j.id}`);
        } finally {
          setLoading(false);
        }
      }}
      className="px-3 py-1 border rounded-md text-sm"
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
