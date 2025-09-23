'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Actions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: 'published' | 'draft') {
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить статус');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Удалить объявление? Это действие необратимо.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Не удалось удалить');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status === 'published' ? (
        <button onClick={() => setStatus('draft')} disabled={busy} className="px-3 py-1 border rounded-md text-sm">
          Снять с публикации
        </button>
      ) : (
        <button onClick={() => setStatus('published')} disabled={busy} className="px-3 py-1 border rounded-md text-sm">
          Опубликовать
        </button>
      )}
      <a href={`/listings/${id}/edit`} className="px-3 py-1 border rounded-md text-sm">Редактировать</a>
      <button onClick={remove} disabled={busy} className="px-3 py-1 border rounded-md text-sm text-red-600">
        Удалить
      </button>
    </div>
  );
}
