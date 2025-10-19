'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenChatButton(props: {
  listingId: string;
  otherUserId: string; // с кем хотим говорить
  label?: string;
}) {
  const { listingId, otherUserId, label = 'Открыть чат с владельцем' } = props;
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function open() {
    try {
      setLoading(true);
      const r = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId: otherUserId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j?.message || j?.error || 'Не удалось открыть чат');
        return;
      }
      router.push(`/chat/${j.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} disabled={loading} className="px-3 py-1 border rounded-md text-sm">
      {loading ? 'Открываем…' : label}
    </button>
  );
}
