'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignedOut, SignInButton } from '@clerk/nextjs';

type Row = {
  id: string;
  name: string | null;
  params: Record<string, string>;
  created_at: string;
};

const toQS = (params: Record<string, string>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') sp.set(k, String(v));
  });
  return sp.toString();
};

export default function SavedSearchesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/saved-searches/my', { cache: 'no-store' });
        const text = await res.text();
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        if (!res.ok) {
          if (res.status === 401) { if (alive) setUnauth(true); return; }
          throw new Error(data?.message || text || 'Ошибка загрузки');
        }
        if (alive) setRows((data.rows || []) as Row[]);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Ошибка сети');
      }
    })();
    return () => { alive = false; };
  }, []);

  if (unauth) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Сохранённые поиски</h1>
        <div className="rounded-2xl border p-6 text-sm">
          <SignedOut>
            Чтобы видеть сохранённые поиски,&nbsp;
            <SignInButton mode="modal"><span className="underline cursor-pointer">войдите</span></SignInButton>.
          </SignedOut>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Сохранённые поиски</h1>

      {err ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">{err}</div>
      ) : rows === null ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">Загрузка…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Пока пусто. Откройте <a className="underline" href="/listings">объявления</a> и нажмите «Сохранить поиск».
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const qs = toQS(r.params || {});
            const url = `/listings${qs ? `?${qs}` : ''}`;
            const created = new Date(r.created_at).toLocaleString('ru-RU');
            return (
              <div key={r.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name || 'Поиск'}</div>
                  <div className="text-xs text-muted-foreground">Создан: {created}</div>
                  <div className="text-xs text-muted-foreground truncate">{url}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a href={url} className="px-3 py-2 border rounded-md text-sm">Открыть</a>
                  <button
                    onClick={async () => {
                      if (!confirm('Удалить этот сохранённый поиск?')) return;
                      const res = await fetch(`/api/saved-searches/${r.id}`, { method: 'DELETE' });
                      if (res.ok) setRows((rows || []).filter(x => x.id !== r.id));
                      else alert('Не удалось удалить');
                    }}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
