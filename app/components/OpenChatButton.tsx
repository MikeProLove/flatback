'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenChatButton({
  listingId,
  otherUserId,
  label = 'Открыть чат',
  className = 'px-3 py-1 border rounded-md text-sm',
}: {
  listingId: string;
  otherUserId: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function open() {
    if (!listingId || !otherUserId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherUserId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.id) throw new Error(j?.message || j?.error || 'open_failed');
      router.push(`/chat/${j.id}`);
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} className={className} disabled={loading}>
      {loading ? 'Открываем…' : label}
    </button>
  );
}
