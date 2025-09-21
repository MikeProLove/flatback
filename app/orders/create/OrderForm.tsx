// app/orders/create/OrderForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product, Service } from '@/lib/types';
import { money } from '@/lib/money';

type Props = {
  products: Product[]; // могут прийти пустыми — тогда загрузим в браузере
  services: Service[];
};

type Line =
  | { kind: 'product'; id: string; name: string; price: number; qty: number }
  | { kind: 'service'; id: string; name: string; price: number; qty: number };

export default function OrderForm({ products, services }: Props) {
  const [items, setItems] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localServices, setLocalServices] = useState<Service[]>(services);

  // Клиентская дозагрузка, если на сервере не было env и списки пришли пустыми
  useEffect(() => {
    async function loadIfNeeded() {
      if (localProducts.length > 0 && localServices.length > 0) return;

      const { getSupabaseBrowser } = await import('@/lib/supabase-browser');
      const supabase = getSupabaseBrowser();
      if (!supabase) return;

      try {
        if (localProducts.length === 0) {
          const { data } = await supabase
            .from('products')
            .select('id, name, description, price, category, stock_qty')
            .order('name', { ascending: true });
          setLocalProducts(
            (data ?? []).map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) }))
          );
        }
        if (localServices.length === 0) {
          const { data } = await supabase
            .from('services')
            .select('id, name, description, price, category, execution_time_minutes')
            .order('name', { ascending: true });
          setLocalServices(
            (data ?? []).map((s) => ({ ...s, price: s.price === null ? null : Number(s.price) }))
          );
        }
      } catch {
        // тихо игнорируем; пользователь всё равно сможет ввести руками, если нужно
      }
    }

    loadIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  function addProduct(id: string) {
    const p = localProducts.find((x) => x.id === id);
    if (!p) return;
    const price = typeof p.price === 'number' ? p.price : 0;
    setItems((prev) => [...prev, { kind: 'product', id: p.id, name: p.name, price, qty: 1 }]);
  }

  function addService(id: string) {
    const s = localServices.find((x) => x.id === id);
    if (!s) return;
    const price = typeof s.price === 'number' ? s.price : 0;
    setItems((prev) => [...prev, { kind: 'service', id: s.id, name: s.name, price, qty: 1 }]);
  }

  function changeQty(index: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty: Math.max(1, qty) } : it)));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* ТОВАР */}
        <div>
          <label className="mb-2 block text-sm font-medium">Товар</label>
          <select
            className="w-full rounded border px-3 py-2"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              addProduct(e.target.value);
              e.currentTarget.value = '';
            }}
          >
            <option value="" disabled>
              {localProducts.length ? 'Выберите товар…' : 'Нет товаров'}
            </option>
            {localProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {typeof p.price === 'number' ? `— ${money(p.price)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* УСЛУГА */}
        <div>
          <label className="mb-2 block text-sm font-medium">Услуга</label>
          <select
            className="w-full rounded border px-3 py-2"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              addService(e.target.value);
              e.currentTarget.value = '';
            }}
          >
            <option value="" disabled>
              {localServices.length ? 'Выберите услугу…' : 'Нет услуг'}
            </option>
            {localServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {typeof s.price === 'number' ? `— ${money(s.price)}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ПОЗИЦИИ */}
      <div className="rounded border">
        <div className="border-b px-4 py-2 text-sm font-medium">Позиции</div>
        <div className="divide-y">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              Пока пусто — добавьте товары или услуги.
            </div>
          ) : (
            items.map((it, idx) => (
              <div key={idx} className="grid items-center gap-3 p-4 md:grid-cols-12">
                <div className="md:col-span-6">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-500">
                    {it.kind === 'product' ? 'Товар' : 'Услуга'} • {money(it.price)}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">Количество</label>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => changeQty(idx, Number(e.target.value))}
                    className="w-24 rounded border px-2 py-1"
                  />
                </div>
                <div className="md:col-span-3 text-right font-semibold">
                  {money(it.price * it.qty)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-gray-500">Итого</div>
          <div className="text-lg font-semibold">{money(total)}</div>
        </div>
      </div>

      {/* Примечание */}
      <div>
        <label className="mb-2 block text-sm font-medium">Примечание</label>
        <textarea
          rows={4}
          className="w-full rounded border px-3 py-2"
          placeholder="Что важно учесть…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={items.length === 0}
          onClick={() => {
            // TODO: server action на сохранение черновика
            alert('Сохранение черновика (заглушка)');
          }}
        >
          Сохранить черновик
        </button>
      </div>
    </div>
  );
}
