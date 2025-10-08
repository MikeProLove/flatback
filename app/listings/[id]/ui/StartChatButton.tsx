'use client';

import { useState, useTransition } from 'react';

export default function StartChatButton({
  listingId,
  ownerId,
  title,
  cover,
}: {
  listingId: string;
  ownerId: string;
  title: string;
  cover?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        onClick={() =>
          start(async () => {
            setErr(null);
            try {
              // пробуем основной роут
              let res = await fetch('/api/chats/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listing_id: listingId, peer_id: ownerId, title, cover }),
              });

              // если его нет — запасной вариант
              if (res.status === 404) {
                res = await fetch('/api/chats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ listing_id: listingId, peer_id: ownerId, title, cover }),
                });
              }

              if (!res.ok) throw new Error(await res.text());
              const j = await res.json();
              if (j?.chat_id) {
                location.href = `/chat/${j.chat_id}`;
              } else {
                // fallback — общий список чатов
                location.href = `/chat`;
              }
            } catch (e: any) {
              setErr(e?.message || 'Не удалось открыть чат');
            }
          })
        }
        className="w-full rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
        disabled={pending}
      >
        Открыть чат с владельцем
      </button>

      {err ? <div className="text-xs text-red-600">{err}</div> : null}
    </div>
  );
}
