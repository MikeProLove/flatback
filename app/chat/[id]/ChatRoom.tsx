'use client';

import { useEffect, useRef, useState } from 'react';
import { SignedOut, SignInButton } from '@clerk/nextjs';

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export default function ChatRoom({ bookingId }: { bookingId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/chats/${bookingId}/messages`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || 'Ошибка загрузки');
      setMessages(j.messages || []);
      setErr(null);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка сети');
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await load(); })();
    const t = setInterval(() => { load(); }, 2500);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Не удалось отправить');
      }
      setText('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] border rounded-2xl overflow-hidden">
      <div className="px-4 py-2 border-b bg-muted/40 text-sm">Чат по заявке</div>

      <div className="flex-1 overflow-auto p-3 space-y-3 bg-white">
        {loading ? (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        ) : err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">Сообщений пока нет.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="max-w-[80%]">
              <div className="rounded-xl border px-3 py-2 text-sm bg-white shadow-sm">
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {new Date(m.created_at).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t bg-white">
        <SignedOut>
          <div className="text-sm">
            Чтобы писать в чате,&nbsp;
            <SignInButton mode="modal">
              <span className="underline cursor-pointer">войдите</span>
            </SignInButton>
            .
          </div>
        </SignedOut>

        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите сообщение…"
            className="flex-1 border rounded-md px-3 py-2 text-sm min-h-[44px]"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
