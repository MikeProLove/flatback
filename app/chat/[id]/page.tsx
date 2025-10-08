'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

type Msg = { id: string; created_at: string; sender_id: string; body: string };

type ChatMeta = {
  id: string;
  listing_id: string | null;
  owner_id: string;
  participant_id: string;
  listing?: { id: string; title: string | null; city: string | null } | null;
};

export default function ChatPage({ params }: { params: { id: string } }) {
  const chatId = params.id;
  const { user } = useUser();
  const me = user?.id || null;

  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const tailRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMeta() {
    const res = await fetch(`/api/chats/${chatId}`, { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.message || j?.error || 'meta_failed');
    setMeta(j.chat as ChatMeta);
  }

  async function loadMessages() {
    const res = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.message || j?.error || 'load_failed');
    setRows(j.messages as Msg[]);
    // автоскролл вниз
    setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        await Promise.all([loadMeta(), loadMessages()]);
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || 'Ошибка загрузки');
          setRows([]);
        }
      }
    })();

    // пуллинг каждые 2 секунды
    timerRef.current = setInterval(() => {
      loadMessages().catch(() => {});
    }, 2000);

    return () => {
      alive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');

    // оптимистично добавим в конец
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      created_at: new Date().toISOString(),
      sender_id: me || 'me',
      body,
    };
    setRows((prev) => (prev ?? []).concat(optimistic));
    setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);

    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      // откатим оптимизм
      setRows((prev) => (prev ?? []).filter((m) => m.id !== optimistic.id));
      const j = await res.json().catch(() => ({}));
      alert(j?.message || j?.error || 'Не удалось отправить');
      return;
    }

    // подтянем «настоящую» версию с id/таймстампом
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
        {meta?.listing_id ? (
          <Link href={`/listings/${meta.listing_id}`} className="text-sm underline">
            {meta?.listing?.title ?? 'Объявление'}
          </Link>
        ) : null}
      </div>

      {err && <div className="text-sm text-red-600 rounded-xl border p-3">{err}</div>}

      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground">
          Вы общаетесь с: <b>{counterpartLabel}</b>
        </div>

        <div
          className="p-4 space-y-2"
          style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto' }}
        >
          {rows === null && <div className="text-sm text-muted-foreground">Загружаем…</div>}
          {(rows ?? []).map((m) => {
            const mine = me && m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border'
                  }`}
                  title={new Date(m.created_at).toLocaleString('ru-RU')}
                >
                  <div className="text-[11px] text-muted-foreground mb-1">
                    {mine ? 'Вы' : counterpartLabel} ·{' '}
                    {new Date(m.created_at).toLocaleString('ru-RU')}
                  </div>
                  <div>{m.body}</div>
                </div>
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
