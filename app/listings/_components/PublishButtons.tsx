'use client';

import { useState } from 'react';

type Props = {
  id: string;
  status?: string;         // 'draft' | 'published' | ...
  onDone?: () => void;     // опционально: что сделать после успеха
};

export default function PublishButtons({ id, status, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const isPublished = (status ?? '').toLowerCase() === 'published';

  async function doAction(action: 'publish' | 'unpublish') {
    try {
      setLoading(true);
      const res = await fetch(`/api/listings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.message || 'Не удалось изменить статус');
        return;
      }
      // Обновляем UI
      if (onDone) onDone();
      else location.reload();
    } catch (e: any) {
      alert(e?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {isPublished ? (
        <button
          onClick={() => doAction('unpublish')}
          disabled={loading}
          className="px-3 py-1 border rounded-md text-sm"
        >
          {loading ? 'Снимаем…' : 'Снять с публикации'}
        </button>
      ) : (
        <button
          onClick={() => doAction('publish')}
          disabled={loading}
          className="px-3 py-1 border rounded-md text-sm"
        >
          {loading ? 'Публикуем…' : 'Опубликовать'}
        </button>
      )}
    </div>
  );
}
