'use client';

import { useState } from 'react';

export default function PublishButtons({ id, status }: { id: string; status?: string }) {
  const [loading, setLoading] = useState<'pub' | 'unpub' | null>(null);

  async function change(action: 'publish' | 'unpublish') {
    try {
      setLoading(action === 'publish' ? 'pub' : 'unpub');
      const res = await fetch(`/api/listings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.message || 'Не удалось изменить статус');
        return;
      }
      location.reload();
    } finally {
      setLoading(null);
    }
  }

  const isPublished = status === 'published';
  return isPublished ? (
    <button
      onClick={() => change('unpublish')}
      disabled={loading !== null}
      className="px-3 py-1 border rounded-md text-sm"
    >
      {loading === 'unpub' ? 'Снимаем…' : 'Снять с публикации'}
    </button>
  ) : (
    <button
      onClick={() => change('publish')}
      disabled={loading !== null}
      className="px-3 py-1 border rounded-md text-sm"
    >
      {loading === 'pub' ? 'Публикуем…' : 'Опубликовать'}
    </button>
  );
}
