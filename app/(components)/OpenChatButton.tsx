'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenChatButton(props: {
  listingId: string;
  otherId: string;          // с кем общаемся (второй пользователь)
  label?: string;
  disabled?: boolean;
}) {
  const { listingId, otherId, label = 'Открыть чат', disabled } = props;
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function open() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const r = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j?.message || j?.error || 'Не удалось открыть чат');
      } else {
        router.push(`/chat/${j.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={disabled || loading}
      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
