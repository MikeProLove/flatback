'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { id: string; created_at: string; sender_id: string; body: string };

export default function ChatPage({ params }: { params: { id: string } }) {
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const tailRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch(`/api/chats/${params.id}/messages`, { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'load_failed');
      setRows(j.messages || []);
      setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
      setRows([]);
    }
  }

  useEffect(() => { load(); }, [params.id]);

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Чат</h1>

      <div className="rounded-2xl border p-0 overflow-hidden">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground">Чат по заявке</div>

        <div className="p-4 space-y-3" style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto' }}>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          {rows === null && <div className="text-sm text-muted-foreground">Загружаем…</div>}
          {(rows ?? []).map((m) => (
            <div key={m.id} className="text-sm">
              <div className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString('ru-RU')}</div>
              <div>{m.body}</div>
            </div>
          ))}
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
