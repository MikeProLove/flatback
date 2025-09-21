// app/orders/create/OrderForm.tsx
'use client';

import React, { useMemo, useState } from 'react';
import type { Product, Service } from '@/lib/types';
import { money } from '@/lib/format';

type Line =
  | { kind: 'product'; id: string; name: string; price: number; qty: number }
  | { kind: 'service'; id: string; name: string; price: number; qty: number };

type Props = {
  products?: Product[];
  services?: Service[];
  onSubmit?: (items: Line[], total: number) => void;
};

export default function OrderForm({ products = [], services = [], onSubmit }: Props) {
  const [items, setItems] = useState<Line[]>([]);

  const total = useMemo(
    () => items.reduce((sum, l) => sum + l.price * l.qty, 0),
    [items]
  );

  // --- Добавление позиций ----------------------------------------------------

  function addProduct(p?: Product) {
    if (!p) return;
    const price =
      typeof p.price === 'number' ? p.price : Number(p.price ?? 0) || 0;

    const id = String((p as any).id); // гарантируем string
    const name =
      (p.name ?? (p as any).title ?? 'Без названия').toString(); // гарантируем string

    setItems((prev) => [
      ...prev,
      { kind: 'product', id, name, price, qty: 1 },
    ]);
  }

  function addService(s?: Service) {
    if (!s) return;
    const price =
      typeof s.price === 'number' ? s.price : Number(s.price ?? 0) || 0;

    const id = String((s as any).id); // гарантируем string
    const name =
      (s.name ?? (s as any).title ?? 'Без названия').toString(); // гарантируем string

    setItems((prev) => [
      ...prev,
      { kind: 'service', id, name, price, qty: 1 },
    ]);
  }

  // --- Изменение количества/удаление ----------------------------------------

  function changeQty(index: number, qty: number) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty: Math.max(1, Math.floor(qty || 1)) };
      return next;
    });
  }

  function removeLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Сабмит ----------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(items, total);
  }

  // --- Простой UI для проверки (можешь заменить на свой) ---------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Добавление из списка продуктов */}
      {products.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-2"
            onChange={(e) => {
              const selected = products.find(
                (p) => String((p as any).id) === e.target.value
              );
              addProduct(selected);
              e.currentTarget.selectedIndex = 0; // сброс выбора
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Добавить товар…
            </option>
            {products.map((p) => (
              <option key={String((p as any).id)} value={String((p as any).id)}>
                {(p.name ?? (p as any).title ?? 'Без названия') as string} —{' '}
                {typeof p.price === 'number' ? money(p.price) : money(p.price ?? 0)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Добавление из списка услуг */}
      {services.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-2"
            onChange={(e) => {
              const selected = services.find(
                (s) => String((s as any).id) === e.target.value
              );
              addService(selected);
              e.currentTarget.selectedIndex = 0; // сброс выбора
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Добавить услугу…
            </option>
            {services.map((s) => (
              <option key={String((s as any).id)} value={String((s as any).id)}>
                {(s.name ?? (s as any).title ?? 'Без названия') as string} —{' '}
                {typeof s.price === 'number' ? money(s.price) : money(s.price ?? 0)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Таблица позиций */}
      <div className="rounded-2xl border divide-y">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            Позиции пока не добавлены.
          </div>
        ) : (
          items.map((line, i) => (
            <div key={`${line.kind}-${line.id}-${i}`} className="p-4 flex items-center gap-4">
              <div className="min-w-24 text-xs uppercase text-muted-foreground">
                {line.kind === 'product' ? 'Товар' : 'Услуга'}
              </div>
              <div className="flex-1 font-medium">{line.name}</div>
              <div className="w-28 text-right">{money(line.price)}</div>
              <div className="w-24">
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-md px-2 py-1"
                  value={line.qty}
                  onChange={(e) => changeQty(i, Number(e.target.value))}
                />
              </div>
              <div className="w-28 text-right font-semibold">
                {money(line.price * line.qty)}
              </div>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => removeLine(i)}
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>

      {/* Итого + сабмит */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Итого</div>
        <div className="text-xl font-semibold">{money(total)}</div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="px-4 py-2 rounded-md border">
          Создать заказ
        </button>
      </div>
    </form>
  );
}
