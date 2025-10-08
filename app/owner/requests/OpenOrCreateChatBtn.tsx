'use client';

import { useState } from 'react';

type Props = {
  chatId?: string | null;
  listingId: string;
  otherId: string; // id арендатора (с кем переписка)
};

export default function OpenOrCreateChatBtn({ chatId, listingId, otherId }: Props) {
  const [loading, setLoading] = useState(false);

  async function open() {
    try {
      setLoading(true);

      // если чат уже есть — просто переходим
      if (chatId) {
        location.href = `/chat/${chatId}`;
        return;
      }

      // иначе создаём/находим чат и переходим
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          otherId, // второй участник (арендатор). Владелец берётся из auth() на сервере
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.id) throw new Error(j?.message || j?.error || 'open_failed');

      location.href = `/chat/${j.id}`;
    } catch (e) {
      alert('Не удалось открыть чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} disabled={loading} className="px-3 py-1 border rounded-md text-sm">
      {loading ? 'Открываем…' : 'Открыть чат'}
    </button>
  );
}
