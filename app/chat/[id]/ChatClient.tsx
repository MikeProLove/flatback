'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { id: string; user_id: string; body: string; created_at: string };

export default function ChatClient({ chatId, me }: { chatId: string; me: string | null }) {
  const [items, setItems] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const r = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || r.statusText);
      setItems(j.messages ?? []);
      // автоскролл вниз
      setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 0);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
    }
  }

  useEffect(() => { load(); }, [chatId]);

  async function send() {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    const r = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (r.ok) load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-3">
      <h1 className="text-2xl font-semibold">Чат</h1>

      <div className="rounded-2xl border">
        <div className="px-4 py-2 border-b text-sm">Чат по заявке</div>

        <div ref={listRef} className="h-[50vh] overflow-y-auto p-4 space-y-2">
          {err ? <div className="text-red-600 text-sm">{err}</div> : null}
          {items?.map((m) => (
            <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.user_id === me ? 'ml-auto bg-blue-50' : 'bg-gray-50'}`}>
              <div>{m.body}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {new Date(m.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
          {!items?.length && !err ? <div className="text-sm text-muted-foreground">Сообщений пока нет.</div> : null}
        </div>

        <div className="flex gap-2 border-t p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Напишите сообщение…"
            className="flex-1 border rounded-md px-3 py-2"
          />
          <button onClick={send} className="px-4 py-2 border rounded-md">Отправить</button>
        </div>
      </div>
    </div>
  );
}
