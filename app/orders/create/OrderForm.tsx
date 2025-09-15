// app/orders/create/OrderForm.tsx
'use client';

import * as React from 'react';

type Product = {
  id: string;
  name: string;
  price_cents?: number;
  price?: number;
  is_active?: boolean;
};

type Service = {
  id: string;
  name: string;
  price_cents?: number;
  price?: number;
  is_active?: boolean;
};

type Props = {
  products: Product[];
  services: Service[];
};

type Line = {
  id: string;
  kind: 'product' | 'service';
  qty: number;
};

function priceToRub(p?: number, c?: number) {
  if (typeof c === 'number') return c / 100;
  if (typeof p === 'number') return p;
  return 0;
}

export default function OrderForm({ products, services }: Props) {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const addProduct = (id: string) => {
    if (!id) return;
    setLines((prev) => [...prev, { id, kind: 'product', qty: 1 }]);
  };

  const addService = (id: string) => {
    if (!id) return;
    setLines((prev) => [...prev, { id, kind: 'service', qty: 1 }]);
  };

  const updateQty = (index: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: Math.max(1, qty) } : l)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const total = lines.reduce((sum, l) => {
    if (l.kind === 'product') {
      const p = products.find((x) => x.id === l.id);
      return sum + (priceToRub(p?.price, p?.price_cents) * l.qty);
    } else {
      const s = services.find((x) => x.id === l.id);
      return sum + (priceToRub(s?.price, s?.price_cents) * l.qty);
    }
  }, 0);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Заглушка для API — подключим позже реальный route handler /actions
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      setMessage('Заказ создан (mock)');
      setLines([]);
    } catch (err: any) {
      setMessage(err?.message ?? 'Ошибка при создании заказа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Добавить товар */}
        <div className="rounded border p-4">
          <div className="mb-2 font-medium">Добавить товар</div>
          <select
            className="w-full rounded border p-2"
            onChange={(e) => {
              addProduct(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Выберите товар…
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {priceToRub(p.price, p.price_cents).toLocaleString('ru-RU')} ₽
              </option>
            ))}
          </select>
        </div>

        {/* Добавить услугу */}
        <div className="rounded border p-4">
          <div className="mb-2 font-medium">Добавить услугу</div>
          <select
            className="w-full rounded border p-2"
            onChange={(e) => {
              addService(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Выберите услугу…
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {priceToRub(s.price, s.price_cents).toLocaleString('ru-RU')} ₽
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Позиции заказа */}
      <div className="rounded border">
        <div className="border-b p-3 font-medium">Позиции</div>
        {lines.length === 0 ? (
          <div className="p-3 text-sm text-neutral-500">Пока пусто — добавьте товары или услуги.</div>
        ) : (
          <ul className="divide-y">
            {lines.map((l, i) => {
              const item =
                l.kind === 'product'
                  ? products.find((x) => x.id === l.id)
                  : services.find((x) => x.id === l.id);

              const unitPrice = priceToRub(item?.price, item?.price_cents);
              return (
                <li key={`${l.kind}-${l.id}-${i}`} className="flex items-center gap-3 p-3">
                  <div className="min-w-24 rounded bg-neutral-100 px-2 py-1 text-xs uppercase">
                    {l.kind}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item?.name ?? '—'}</div>
                    <div className="text-sm text-neutral-500">
                      {unitPrice.toLocaleString('ru-RU')} ₽ ×
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    className="w-24 rounded border p-2 text-right"
                    value={l.qty}
                    onChange={(e) => updateQty(i, Number(e.target.value))}
                  />
                  <div className="w-32 text-right font-medium">
                    {(unitPrice * l.qty).toLocaleString('ru-RU')} ₽
                  </div>
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm hover:bg-neutral-50"
                    onClick={() => removeLine(i)}
                  >
                    Удалить
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between border-t p-3">
          <div className="text-neutral-500">Итого</div>
          <div className="text-lg font-semibold">{total.toLocaleString('ru-RU')} ₽</div>
        </div>
      </div>

      {message && (
        <div className="rounded border p-3 text-sm">{message}</div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || lines.length === 0}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Создаём…' : 'Создать заказ'}
        </button>
      </div>
    </form>
  );
}
