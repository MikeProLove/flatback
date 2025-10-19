'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  listingId: string;
  otherId: string;
  label?: string;
  disabled?: boolean;
};

export default function OpenChatButton({
  listingId,
  otherId,
  label = 'Открыть чат',
  disabled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chats/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, otherId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message || data?.error || 'server_error';
        alert(msg);
        return;
        }
      if (data?.id) {
        router.push(`/chat/${data.id}`);
      } else {
        alert('Не удалось получить id чата');
      }
    } catch (e: any) {
      alert(e?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="px-3 py-1 border rounded-md text-sm hover:bg-muted disabled:opacity-60"
      aria-busy={loading}
    >
      {loading ? 'Открываем…' : label}
    </button>
  );
}
