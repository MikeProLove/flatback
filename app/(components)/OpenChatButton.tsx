'use client';

import { useState } from 'react';

type Props = {
  listingId: string;
  /** можно не передавать — сервер возьмёт владельца объявления */
  otherId?: string;
  label?: string;
  disabled?: boolean;
};

export default function OpenChatButton({
  listingId,
  otherId,
  label = 'Открыть чат',
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function open() {
    if (loading) return;
    setLoading(true);
    try {
      const payload = otherId ? { listingId, otherId } : { listingId };

      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(j?.message || j?.error || 'db_error');
        return;
      }
      window.location.href = `/chat/${j.id}`;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={disabled || loading}
      className="px-3 py-1 border rounded-md text-sm"
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
