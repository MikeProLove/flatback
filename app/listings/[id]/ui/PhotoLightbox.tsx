'use client';

import { useState } from 'react';

export default function PhotoLightbox({
  images,
  thumbClass,
}: {
  images: string[];
  thumbClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  if (!images.length) return null;

  return (
    <>
      {/* превью (первая картинка) */}
      <div
        className={thumbClass}
        onClick={() => {
          setI(0);
          setOpen(true);
        }}
        role="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt=""
          className="w-full h-[360px] object-cover"
          loading="lazy"
        />
      </div>

      {/* модалка */}
      {open ? (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-5xl w-full px-6" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[i]} alt="" className="w-full h-full object-contain" />
              {/* навигация */}
              {i > 0 ? (
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2"
                  onClick={() => setI((v) => Math.max(0, v - 1))}
                >
                  ‹
                </button>
              ) : null}
              {i < images.length - 1 ? (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2"
                  onClick={() => setI((v) => Math.min(images.length - 1, v + 1))}
                >
                  ›
                </button>
              ) : null}
              <button
                className="absolute right-2 top-2 rounded-full border bg-white/90 px-3 py-1"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className="mt-2 text-center text-white/80 text-sm">
              {i + 1} / {images.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
