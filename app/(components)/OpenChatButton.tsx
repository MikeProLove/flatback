'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenChatButton({
  listingId,
  otherUserId,           // можно не передавать на странице объявления
  label = 'Открыть чат',
  className = 'px-3 py-1 border rounded-md text-sm'
}: {
  listingId: string;
  otherUserId?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function open() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId: otherUserId ?? null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.id) {
        alert(j?.message || j?.error || 'Не удалось открыть чат');
        return;
      }
      router.push(`/chat/${j.id}`);          // ← всегда в единственное число
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={open} disabled={busy} className={className}>
      {busy ? 'Открываем…' : label}
    </button>
  );
}
