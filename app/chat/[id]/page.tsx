'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';

type Msg = { id: string; created_at: string; sender_id: string; body: string };
type Chat = { id: string; owner_id: string; participant_id: string };

export default function ChatPage({ params }: { params: { id: string } }) {
  const { userId } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [rows, setRows] = useState<Msg[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const tailRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch(`/api/chats/${params.id}/messages`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || 'load_failed');
      setChat(j.chat);
      setRows(j.messages || []);
      setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
    }
  }

  // первичная загрузка
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  // автообновление раз в 3 сек
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [params.id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const res = await fetch(`/api/chats/${params.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j?.message || j?.error || 'Не удалось отправить');
      return;
    }
    await load();
  }

  const you = userId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Чат</h1>

      <div className="rounded-2xl border overflow-hidden">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground">
          Чат по заявке
        </div>

        <div className="p-4 space-y-3" style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto' }}>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          {!err && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">Пока сообщений нет.</div>
          )}

          {rows.map((m) => {
            const mine = m.sender_id === you;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-gray-900 text-white' : 'bg-gray-100'
                  }`}
                >
                  <div className="text-[11px] opacity-70 mb-0.5">
                    {mine ? 'Вы' : 'Собеседник'} ·{' '}
                    {new Date(m.created_at).toLocaleString('ru-RU')}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
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
            placeholder="Напишите сообщение…"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button onClick={send} className="px-3 py-2 border rounded-md">Отправить</button>
        </div>
      </div>
    </div>
  );
}
