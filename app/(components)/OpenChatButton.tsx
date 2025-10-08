'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  listingId: string;          // ID объявления (обязательно)
  otherUserId?: string;       // ID второго участника (для «заявки на мои»)
  label?: string;
  className?: string;
};

export default function OpenChatButton({
  listingId,
  otherUserId,
  label = 'Открыть чат',
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId: otherUserId ?? null }),
      });

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { error: await res.text() };

      if (!res.ok || !data?.chatId) {
        const msg = data?.message || data?.error || 'Не удалось открыть чат';
        // дружелюбный текст, если сработало ограничение "нельзя чатить с самим собой"
        if (typeof msg === 'string' && msg.includes('chats_no_self')) {
          throw new Error('Нельзя открыть чат с самим собой.');
        }
        throw new Error(msg);
      }

      // ВАЖНО: переходим на /chat/:id (в единственном числе)
      router.push(`/chat/${data.chatId}`);
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть чат');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={className ?? 'px-3 py-1 border rounded-md text-sm'}
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
