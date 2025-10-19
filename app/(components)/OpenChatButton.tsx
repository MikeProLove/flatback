'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenChatButton({
  listingId,
  otherId,        // можно не передавать в "Мои заявки" — сервер сам определит владельца
  label = 'Открыть чат',
  disabled = false,
}: { listingId: string; otherId?: string; label?: string; disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function open() {
    try {
      setPending(true);
      const r = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || 'open_failed');
      if (!j?.id) throw new Error('not_found');
      router.push(`/chat/${j.id}`);
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={pending || disabled}
      className="px-3 py-1 border rounded-md text-sm disabled:opacity-60"
    >
      {pending ? 'Открываем…' : label}
    </button>
  );
}
