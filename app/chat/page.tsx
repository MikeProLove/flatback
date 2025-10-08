'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

type Row = {
  id: string;
  listing_id: string | null;
  owner_id: string;
  participant_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  listing: { id: string; title: string | null; city: string | null } | null;
  cover_url: string | null;
};

export default function ChatListPage() {
  const { user } = useUser();
  const me = user?.id || null;

  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const r = await fetch('/api/chats/my', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || j?.error || 'load_failed');
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
      setRows([]);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // автообновление раз в 10 сек
    return () => clearInterval(t);
  }, []);

  if (rows === null) {
    return <div className="mx-auto max-w-5xl px-4 py-8">Загружаем…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Чаты</h1>
      {err && <div className="text-sm text-red-600 rounded-xl border p-3">{err}</div>}

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground rounded-xl border p-4">
          У вас пока нет чатов.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const counterpartIsOwner = me ? c.owner_id !== me : false;
            const counterpartLabel = !me
              ? 'Собеседник'
              : c.owner_id === me
              ? 'Арендатор'
              : 'Арендодатель';

            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="flex gap-3 border rounded-2xl overflow-hidden hover:bg-muted/30"
              >
                <div className="w-28 h-20 bg-muted">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium">{c.listing?.title ?? 'Объявление'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.listing?.city ?? '—'}</div>
                  <div className="text-sm mt-1 line-clamp-1">
                    <span className="font-medium">{counterpartLabel}:</span>{' '}
                    {c.last_message_preview ?? 'без сообщений'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
