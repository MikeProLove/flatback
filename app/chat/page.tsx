'use client';

import { useEffect, useState } from 'react';
import { SignedOut, SignInButton } from '@clerk/nextjs';

type Thread = {
  booking_id: string;
  listing_id: string | null;
  other_id: string | null;
  last_message: { body: string; created_at: string; sender_id: string } | null;
  unread: number;
  listing_title: string | null;
  listing_city: string | null;
  cover_url: string | null;
  created_at: string;
};

export default function ChatInboxPage() {
  const [rows, setRows] = useState<Thread[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/chats/threads', { cache: 'no-store' });
        const text = await res.text();
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch { /* text wasn't JSON */ }

        if (!res.ok) {
          if (res.status === 401) { if (alive) setUnauth(true); return; }
          throw new Error(data?.message || text || 'Ошибка загрузки');
        }
        if (alive) setRows(data.threads || []);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Ошибка сети');
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Чаты</h1>

      {unauth ? (
        <div className="rounded-2xl border p-6 text-sm">
          Чтобы увидеть диалоги,&nbsp;
          <SignInButton mode="modal"><span className="underline cursor-pointer">войдите</span></SignInButton>.
        </div>
      ) : err ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">{err}</div>
      ) : rows === null ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Загрузка…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Диалоги появятся после отправки или получения заявки.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <a
              key={t.booking_id}
              href={`/chat/${t.booking_id}`}
              className="flex gap-3 items-center rounded-2xl border p-3 hover:shadow transition"
            >
              <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden">
                {t.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover_url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium truncate">{t.listing_title ?? 'Объявление'}</div>
                  {t.unread > 0 ? (
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{t.unread}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.listing_city ?? '—'}
                </div>
                <div className="text-sm truncate">
                  {t.last_message ? t.last_message.body : 'Сообщений ещё нет'}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
