'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Msg = { id: string; created_at: string; sender_id: string; body: string };
type ChatMeta = {
  id: string;
  owner_id: string;
  participant_id: string;
  listing: { id: string; title: string | null; city: string | null } | null;
};

export default function ChatClient({ chatId, me }: { chatId: string; me: string | null }) {
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [rows, setRows] = useState<Msg[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const tailRef = useRef<HTMLDivElement | null>(null);

  async function loadMeta() {
    const r = await fetch(`/api/chats/${chatId}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'meta_failed');
    setMeta(j.chat);
  }

  async function loadMessages() {
    const r = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'load_failed');
    setRows(j.messages || []);
    setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);
  }

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        await Promise.all([loadMeta(), loadMessages()]);
      } catch (e: any) {
        setErr(e?.message || 'Ошибка загрузки');
      }
    })();

    // простое автообновление раз в 2 сек
    const t = setInterval(() => loadMessages().catch(() => {}), 2000);
    return () => clearInterval(t);
  }, [chatId]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');

    // оптимистично добавим в список
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      created_at: new Date().toISOString(),
      sender_id: me || 'me',
      body,
    };
    setRows((prev) => [...prev, optimistic]);
    setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);

    const r = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!r.ok) {
      // откатим и покажем ошибку
      setRows((prev) => prev.filter((m) => m.id !== optimistic.id));
      const j = await r.json().catch(() => ({}));
      alert(j?.message || j?.error || 'Не удалось отправить');
      return;
    }
    // перезагрузим из API (чтобы получить реальный id/время)
    await loadMessages();
  }

  const counterpartLabel =
    meta && me
      ? meta.owner_id === me
        ? 'Арендатор'
        : 'Арендодатель'
      : 'Собеседник';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Чат</h1>
        {meta?.listing ? (
          <Link
            href={`/listings/${meta.listing.id}`}
            className="text-sm underline"
          >
            {meta.listing.title ?? 'Объявление'}
          </Link>
        ) : null}
      </div>

      {err && <div className="text-sm text-red-600 rounded-xl border p-3">{err}</div>}

      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground">
          Вы общаетесь с: <b>{counterpartLabel}</b>
        </div>

        <div className="p-4 space-y-2" style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto' }}>
          {rows.map((m) => {
            const mine = me && m.sender_id === me;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-blue-50' : 'bg-gray-50'}`}
                title={new Date(m.created_at).toLocaleString('ru-RU')}
              >
                <div className="text-[11px] text-muted-foreground mb-0.5">
                  {mine ? 'Вы' : counterpartLabel}
                </div>
                <div>{m.body}</div>
              </div>
            );
          })}
          <div ref={tailRef} />
        </div>

        <div className="border-t p-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Напишите сообщение…"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button onClick={send} className="px-3 py-2 border rounded-md">
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
