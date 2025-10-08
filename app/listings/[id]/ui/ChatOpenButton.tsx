'use client';

import { useState } from 'react';

export default function ChatOpenButton({
  listingId,
  ownerId,
  label = 'Открыть чат с владельцем',
}: {
  listingId: string;
  ownerId: string;       // другой пользователь
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    if (!listingId || !ownerId) {
      alert('listingId и otherId обязательны');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId: ownerId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || 'bad_request');
      location.href = `/chats/${j.id}`;
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть чат');
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
