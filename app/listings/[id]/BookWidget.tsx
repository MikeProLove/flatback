'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

type Busy = { start: string; end: string };

function money(v: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);
  } catch {
    return `${Math.round(v || 0)} ₽`;
  }
}

function parseISO(d: string) {
  const dt = new Date(d);
  return Number.isFinite(+dt) ? dt : null;
}

function overlaps(aStart: string, aEnd: string, busy: Busy[]) {
  const A1 = parseISO(aStart);
  const A2 = parseISO(aEnd);
  if (!A1 || !A2) return true;
  // нормализуем до полуночи
  A1.setHours(0, 0, 0, 0);
  A2.setHours(0, 0, 0, 0);
  if (A1 > A2) return true;

  return busy.some((b) => {
    const B1 = parseISO(b.start)!; B1.setHours(0,0,0,0);
    const B2 = parseISO(b.end)!;   B2.setHours(0,0,0,0);
    // пересечение по датам (включительно)
    return A1 <= B2 && A2 >= B1;
  });
}

export default function BookWidget({
  listingId,
  price,
  deposit,
}: {
  listingId: string;
  price?: number | null;
  deposit?: number | null;
}) {
  const [busy, setBusy] = useState<Busy[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listings/${listingId}/availability`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (res.ok) setBusy(json.busy ?? []);
        else setErr(json?.message || 'Не удалось загрузить занятость');
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Ошибка сети');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [listingId]);

  const clash = useMemo(() => (start && end ? overlaps(start, end, busy) : false), [start, end, busy]);
  const canSend = !!start && !!end && !clash && !submitting;

  return (
    <div className="rounded-2xl border p-4 space-y-4">
      <h3 className="font-medium">Забронировать</h3>

      {loading ? (
        <div className="text-sm text-muted-foreground">Загружаем занятость…</div>
      ) : (
        <>
          {busy.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              Занято:{' '}
              {busy.slice(0, 6).map((b, i) => (
                <span key={i} className="inline-block mr-2">
                  {new Date(b.start).toLocaleDateString('ru-RU')}–{new Date(b.end).toLocaleDateString('ru-RU')}
                </span>
              ))}
              {busy.length > 6 ? '…' : null}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Пока нет занятых дат.</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1">Дата начала</div>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <div className="mb-1">Дата окончания</div>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </label>
          </div>

          <div className="text-sm">
            {price != null ? <div>Аренда: <b>{money(Number(price) || 0)}</b> / мес</div> : null}
            {deposit ? <div>Залог: <b>{money(Number(deposit) || 0)}</b></div> : null}
          </div>

          {clash ? (
            <div className="text-xs text-red-600">Выбранные даты пересекаются с уже занятыми.</div>
          ) : null}

          {err ? <div className="text-xs text-red-600">{err}</div> : null}
          {msg ? <div className="text-xs text-green-600">{msg}</div> : null}

          <SignedOut>
            <div className="text-sm">
              Чтобы отправить заявку,&nbsp;
              <SignInButton mode="modal">
                <span className="underline cursor-pointer">войдите</span>
              </SignInButton>
              .
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3">
              <button
                disabled={!canSend}
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    setMsg(null); setErr(null);
                    const res = await fetch('/api/bookings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        listing_id: listingId,
                        start_date: start,
                        end_date: end,
                      }),
                    });
                    if (res.status === 409) {
                      const j = await res.json().catch(() => ({}));
                      setErr(j?.message || 'Выбранные даты недоступны');
                    } else if (!res.ok) {
                      const t = await res.text();
                      setErr(t || 'Не удалось отправить заявку');
                    } else {
                      setMsg('Заявка отправлена. Перейдите в «Мои заявки».');
                      // необязательный редирект:
                      setTimeout(() => { window.location.href = '/requests'; }, 800);
                    }
                  } catch (e: any) {
                    setErr(e?.message || 'Ошибка сети');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className={`px-4 py-2 rounded-md border text-sm ${canSend ? 'bg-black text-white' : 'opacity-50'}`}
              >
                {submitting ? 'Отправка…' : 'Отправить заявку'}
              </button>

              <a href="/requests" className="text-sm underline">Мои заявки</a>
            </div>
          </SignedIn>
        </>
      )}
    </div>
  );
}
