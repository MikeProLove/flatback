'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

type Props = {
  listingId: string;
  /** id второго участника. Можно не передавать — на сервере определим владельца объявления */
  otherId?: string;
  label?: string;
  disabled?: boolean;
};

export default function OpenChatButton({ listingId, otherId, label = 'Открыть чат', disabled }: Props) {
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function open() {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId }),
      });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(j?.message || j?.error || 'Не удалось открыть чат');
        return;
      }
      router.push(`/chat/${j.id}`);
    } finally {
      setBusy(false);
    }
  }

  const isMine = userId && otherId && userId === otherId;
  const isDisabled = disabled || !listingId || busy || !!isMine;

  return (
    <button
      onClick={open}
      disabled={isDisabled}
      className="px-3 py-1 border rounded-md text-sm disabled:opacity-60"
      title={isMine ? 'Нельзя открыть чат с самим собой' : undefined}
    >
      {busy ? 'Открываем…' : label}
    </button>
  );
}
