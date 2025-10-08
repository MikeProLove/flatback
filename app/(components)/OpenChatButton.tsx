'use client';

import { useState } from 'react';

type Props = {
  listingId: string;
  otherUserId: string;          // с кем открываем чат
  label?: string;
  className?: string;
};

export default function OpenChatButton({ listingId, otherUserId, label = 'Открыть чат', className }: Props) {
  const [loading, setLoading] = useState(false);

  async function open() {
    if (!listingId || !otherUserId) {
      alert('listingId и otherUserId обязательны');
      return;
    }

    // простая защита от чата с самим собой (на всякий)
    try {
      // @ts-ignore
      const me = (window as any).__clerk?.user?.id;
      if (me && me === otherUserId) {
        alert('Нельзя открыть чат с самим собой');
        return;
      }
    } catch {}

    setLoading(true);
    try {
      const r = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId: otherUserId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || 'bad_request');

      // ВАЖНО: путь /chat/, а не /chats/
      location.href = `/chat/${j.chatId}`;
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} className={className ?? 'px-3 py-1 border rounded-md text-sm'} disabled={loading}>
      {loading ? 'Открываем…' : label}
    </button>
  );
}
