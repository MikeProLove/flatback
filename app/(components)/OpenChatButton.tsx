'use client';

import { useState } from 'react';

export default function OpenChatButton({
  listingId,
  otherId,
  label = 'Открыть чат',
  className,
}: {
  listingId: string;
  otherId: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    if (!listingId || !otherId) {
      alert('listingId и otherId обязательны'); // строгая проверка на клиенте
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.chatId) throw new Error(j?.message || j?.error || 'bad_request');
      location.href = `/chat/${j.chatId}`;
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={loading}
      className={className ?? 'px-3 py-1 border rounded-md text-sm'}
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
