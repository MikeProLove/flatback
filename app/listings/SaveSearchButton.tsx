'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

const KEYS = ['q','city','rooms','price_min','price_max','area_min','area_max','sort','with_photos'] as const;
type Key = typeof KEYS[number];

function currentParams(): Record<string, string> {
  const out: Record<string, string> = {};
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  KEYS.forEach((k) => {
    const v = sp.get(k);
    if (v && v !== '') out[k] = v;
  });
  return out;
}

export default function SaveSearchButton() {
  const [busy, setBusy] = useState(false);

  const click = async () => {
    const name = prompt('Название поиска (например «Москва 1-2к до 80 тыс.»):') || '';
    const params = currentParams();
    setBusy(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, params }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Не удалось сохранить');
      }
      alert('Поиск сохранён.');
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-3 py-2 border rounded-md text-sm">Сохранить поиск</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <button onClick={click} disabled={busy} className="px-3 py-2 border rounded-md text-sm">
          {busy ? 'Сохраняем…' : 'Сохранить поиск'}
        </button>
      </SignedIn>

      <a href="/saved-searches" className="text-sm underline">Мои сохранённые</a>
    </div>
  );
}
