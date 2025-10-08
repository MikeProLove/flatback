'use client';

import { useState } from 'react';

type Img = { url: string };

export default function PhotoGallery({ images }: { images: Img[] }) {
  if (!images?.length) {
    return (
      <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
        Фото не загружены.
      </div>
    );
  }

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1);

  function openAt(i: number) { setIdx(i); setZoom(1); setOpen(true); }
  function prev() { setIdx((i) => (i - 1 + images.length) % images.length); setZoom(1); }
  function next() { setIdx((i) => (i + 1) % images.length); setZoom(1); }
  function close() { setOpen(false); setZoom(1); }
  function zoomIn() { setZoom((z) => Math.min(4, z + 0.25)); }
  function zoomOut() { setZoom((z) => Math.max(1, z - 0.25)); }

  // сетка превью 2 x N
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <button
            key={img.url + i}
            onClick={() => openAt(i)}
            className="relative group aspect-[4/3] overflow-hidden rounded-2xl border bg-muted"
            aria-label="Открыть фото"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Лайтбокс */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <button
            onClick={close}
            className="absolute top-4 right-4 px-3 py-1 rounded-md bg-white/90 text-sm"
          >
            Закрыть
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button onClick={zoomOut} className="px-3 py-1 rounded-md bg-white/90 text-sm">–</button>
            <div className="px-3 py-1 rounded-md bg-white/70 text-sm">{Math.round(zoom * 100)}%</div>
            <button onClick={zoomIn} className="px-3 py-1 rounded-md bg-white/90 text-sm">+</button>
          </div>

          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-white/90 text-sm"
          >
            ←
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-white/90 text-sm"
          >
            →
          </button>

          <div className="max-w-[92vw] max-h-[90vh] overflow-hidden rounded-xl border bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[idx].url}
              alt=""
              className="block object-contain"
              style={{
                width: `calc(92vw * ${zoom})`,
                height: `calc(90vh * ${zoom})`,
                transform: `scale(1)`,
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
