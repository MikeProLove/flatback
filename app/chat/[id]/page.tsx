'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

type Msg = { id: string; created_at: string; sender_id: string; body: string };
type ChatMeta = { id: string; listing_id: string | null; owner_id: string; participant_id: string };

export default function ChatPage({ params }: { params: { id: string } }) {
  const { userId } = useAuth();
  const [rows, setRows] = useState<Msg[] | null>(null);
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const tailRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const r = await fetch(`/api/chats/${params.id}/messages`, { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      const j = ct.includes('json') ? await r.json() : { error: await r.text() };
      if (!r.ok) throw new Error(j?.message || j?.error || `HTTP ${r.status}`);
      setMeta(j.chat);
      setRows(j.messages || []);
      setTimeout(() => tailRef.current?.scrollIntoView({ block: 'end' }), 0);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка загрузки');
      setRows([]);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  // лёгкий поллинг, чтобы видеть новые сообщения
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [params.id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const r = await fetch(`/api/chats/${params.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j?.message || j?.error || 'Не удалось отправить');
      return;
    }
    await load();
  }

  const me = userId || '';
  const otherId = meta ? (meta.owner_id === me ? meta.participant_id : meta.owner_id) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Чат</h1>

      <div className="rounded-2xl border p-0 overflow-hidden">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground">
          Чат по заявке
        </div>

        <div className="p-4 space-y-3" style={{ minHeight: 360, maxHeight: 560, overflowY: 'auto' }}>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          {rows === null && <div className="text-sm text-muted-foreground">Загружаем…</div>}

          {otherId && (
            <div className="text-xs text-muted-foreground mb-2">
              Вы общаетесь с: <b>Собеседник</b>
            </div>
          )}

          {(rows ?? []).map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-snug ${mine ? 'bg-black text-white' : 'bg-gray-100'}`}>
                  <div className="text-[10px] opacity-70 mb-0.5">{mine ? 'Вы' : 'Собеседник'}</div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[10px] opacity-60 mt-1 text-right">
                    {new Date(m.created_at).toLocaleString('ru-RU')}
                  </div>
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
