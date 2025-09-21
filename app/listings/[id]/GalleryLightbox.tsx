'use client';

import React, { useEffect, useState } from 'react';

type Photo = { id: string; url: string; alt?: string };

export default function GalleryLightbox({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // блокируем прокрутку фона при открытом модальном окне
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // клавиатура: Esc/←/→
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos.length]);

  if (!photos?.length) return null;

  const openAt = (i: number) => {
    setIdx(i);
    setOpen(true);
  };

  return (
    <>
      {/* миниатюры */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.url}
            alt={p.alt ?? ''}
            className="w-full h-48 object-cover rounded-md cursor-zoom-in"
            onClick={() => openAt(i)}
          />
        ))}
      </div>

      {/* оверлей */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* стопаем клики по самому изображению, чтобы не закрывать */}
          <div className="relative max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* изображение */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[idx].url}
              alt={photos[idx].alt ?? ''}
              className="max-h-[90vh] max-w-[95vw] object-contain select-none"
              draggable={false}
            />

            {/* кнопка закрыть */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
              aria-label="Закрыть"
            >
              ×
            </button>

            {/* навигация */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Предыдущее фото"
                >
                  ←
                </button>
                <button
                  onClick={() => setIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Следующее фото"
                >
                  →
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/80 text-xs">
                  {idx + 1} / {photos.length}
                </div>
              </>
            )}

            {/* открыть оригинал в новой вкладке */}
            <a
              href={photos[idx].url}
              target="_blank"
              className="absolute bottom-2 right-2 text-white/80 text-xs underline"
              rel="noreferrer"
            >
              Открыть оригинал
            </a>
          </div>
        </div>
      )}
    </>
  );
}
