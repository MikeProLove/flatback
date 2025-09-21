// app/orders/create/OrderForm.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Product, Service } from '@/lib/types';
import { money } from '@/lib/format';

type Line =
  | { kind: 'product'; id: string; name: string; price: number; qty: number }
  | { kind: 'service'; id: string; name: string; price: number; qty: number };

type Props = {
  products?: Product[];
  services?: Service[];
  preProductId?: string;
  preServiceId?: string;
};

export default function OrderForm({
  products = [],
  services = [],
  preProductId,
  preServiceId,
}: Props) {
  const [items, setItems] = useState<Line[]>([]);
  const total = useMemo(() => items.reduce((s, l) => s + l.price * l.qty, 0), [items]);
  const router = useRouter();

  // ---- категории
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add((p.category ?? 'Без категории').toString()));
    return Array.from(set).sort();
  }, [products]);

  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add((s.category ?? 'Без категории').toString()));
    return Array.from(set).sort();
  }, [services]);

  // ---- выбранные значения селектов
  const [prodCategory, setProdCategory] = useState<string>('');
  const [prodId, setProdId] = useState<string>('');
  const [servCategory, setServCategory] = useState<string>('');
  const [servId, setServId] = useState<string>('');

  const filteredProducts = useMemo(
    () => products.filter((p) => (prodCategory ? (p.category ?? 'Без категории') === prodCategory : true)),
    [products, prodCategory]
  );
  const filteredServices = useMemo(
    () => services.filter((s) => (servCategory ? (s.category ?? 'Без категории') === servCategory : true)),
    [services, servCategory]
  );

  // ---- add helpers
  function addProductById(id: string) {
    const p = products.find((x) => String((x as any).id) === id);
    if (!p) return;
    const price = typeof p.price === 'number' ? p.price : Number(p.price ?? 0) || 0;
    const name = (p.name ?? (p as any).title ?? 'Без названия').toString();
    setItems((prev) => [...prev, { kind: 'product', id: String((p as any).id), name, price, qty: 1 }]);
  }
  function addServiceById(id: string) {
    const s = services.find((x) => String((x as any).id) === id);
    if (!s) return;
    const price = typeof s.price === 'number' ? s.price : Number(s.price ?? 0) || 0;
    const name = (s.name ?? (s as any).title ?? 'Без названия').toString();
    setItems((prev) => [...prev, { kind: 'service', id: String((s as any).id), name, price, qty: 1 }]);
  }

  // ---- авто-добавление по query (?product=... / ?service=...)
  const preAdded = useRef(false);
  useEffect(() => {
    if (preAdded.current) return;
    let touched = false;

    if (preProductId) {
      // выставим категорию, чтобы в селекте был правильный список
      const p = products.find((x) => String((x as any).id) === preProductId);
      if (p) {
        setProdCategory((p.category ?? 'Без категории').toString());
        addProductById(preProductId);
        touched = true;
      }
    }
    if (preServiceId) {
      const s = services.find((x) => String((x as any).id) === preServiceId);
      if (s) {
        setServCategory((s.category ?? 'Без категории').toString());
        addServiceById(preServiceId);
        touched = true;
      }
    }

    if (touched) preAdded.current = true;
  }, [preProductId, preServiceId, products, services]);

  // ---- изменение/удаление
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

  // ---- сабмит
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  setSubmitting(true);
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { orderId: string };
    router.push(`/orders/${data.orderId}`); // ⬅️ сразу на карточку заказа
  } catch (err: any) {
    setError(err.message || 'Ошибка');
  } finally {
    setSubmitting(false);
  }
}

  // ---- UI
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ТОВАРЫ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Добавить товар</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border rounded-md px-3 py-2"
            value={prodCategory}
            onChange={(e) => {
              setProdCategory(e.target.value);
              setProdId('');
            }}
            disabled={products.length === 0}
          >
            <option value="">Все категории</option>
            {productCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="border rounded-md px-3 py-2 min-w-[280px]"
            value={prodId}
            onChange={(e) => setProdId(e.target.value)}
            disabled={filteredProducts.length === 0}
          >
            <option value="" disabled>
              {products.length === 0 ? 'Нет товаров' : 'Выберите товар'}
            </option>
            {filteredProducts.map((p) => (
              <option key={String((p as any).id)} value={String((p as any).id)}>
                {(p.name ?? (p as any).title ?? 'Без названия') as string} —{' '}
                {typeof p.price === 'number' ? money(p.price) : money(p.price ?? 0)}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="px-3 py-2 rounded-md border"
            onClick={() => prodId && addProductById(prodId)}
            disabled={!prodId}
          >
            Добавить товар
          </button>
        </div>
      </section>

      {/* УСЛУГИ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Добавить услугу</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border rounded-md px-3 py-2"
            value={servCategory}
            onChange={(e) => {
              setServCategory(e.target.value);
              setServId('');
            }}
            disabled={services.length === 0}
          >
            <option value="">Все категории</option>
            {serviceCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="border rounded-md px-3 py-2 min-w-[280px]"
            value={servId}
            onChange={(e) => setServId(e.target.value)}
            disabled={filteredServices.length === 0}
          >
            <option value="" disabled>
              {services.length === 0 ? 'Нет услуг' : 'Выберите услугу'}
            </option>
            {filteredServices.map((s) => (
              <option key={String((s as any).id)} value={String((s as any).id)}>
                {(s.name ?? (s as any).title ?? 'Без названия') as string} —{' '}
                {typeof s.price === 'number' ? money(s.price) : money(s.price ?? 0)}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="px-3 py-2 rounded-md border"
            onClick={() => servId && addServiceById(servId)}
            disabled={!servId}
          >
            Добавить услугу
          </button>
        </div>
      </section>

      {/* ПОЗИЦИИ */}
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

      {/* ИТОГО / САБМИТ */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Итого</div>
        <div className="text-xl font-semibold">{money(total)}</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {createdId ? (
        <div className="text-sm text-green-600">Заказ создан: {createdId}</div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-md border"
          disabled={items.length === 0 || submitting}
        >
          {submitting ? 'Создаём…' : 'Создать заказ'}
        </button>
      </div>
    </form>
  );
}
