'use client';

import { useState } from 'react';

type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  stock_qty?: number;
};

type Service = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  execution_time_minutes?: number;
};

type Props = {
  products: Product[];
  services: Service[];
  // Если позже добавим серверный экшен — можно прокинуть prop onSubmit/action
};

export default function OrderForm({ products, services }: Props) {
  const [productId, setProductId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [qtyProduct, setQtyProduct] = useState<number>(1);
  const [qtyService, setQtyService] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  const pickedProduct = products.find((p) => p.id === productId);
  const pickedService = services.find((s) => s.id === serviceId);

  const productPrice = pickedProduct?.price ?? 0;
  const servicePrice = pickedService?.price ?? 0;
  const total = productPrice * (qtyProduct || 0) + servicePrice * (qtyService || 0);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
      Number.isFinite(n) ? n : 0
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // На сейчас просто логируем — позже подключим server action createOrder
    console.log('ORDER_DRAFT', {
      productId,
      qtyProduct,
      serviceId,
      qtyService,
      note,
      total,
    });
    alert('Черновик заказа сформирован в консоли. Позже свяжем с БД.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* ТОВАР */}
        <div>
          <label className="mb-1 block text-sm font-medium">Товар</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="" disabled>
              {products.length ? 'Выберите товар…' : 'Нет товаров'}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.price ? `— ${formatMoney(p.price)}` : ''}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-600">Количество</label>
            <input
              type="number"
              min={1}
              className="w-24 rounded border px-2 py-1"
              value={qtyProduct}
              onChange={(e) => setQtyProduct(Number(e.target.value) || 1)}
              disabled={!productId}
            />
          </div>
        </div>

        {/* УСЛУГА */}
        <div>
          <label className="mb-1 block text-sm font-medium">Услуга</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="" disabled>
              {services.length ? 'Выберите услугу…' : 'Нет услуг'}
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.price ? `— ${formatMoney(s.price)}` : ''}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-gray-600">Количество</label>
            <input
              type="number"
              min={1}
              className="w-24 rounded border px-2 py-1"
              value={qtyService}
              onChange={(e) => setQtyService(Number(e.target.value) || 1)}
              disabled={!serviceId}
            />
          </div>
        </div>
      </div>

      {/* ПРИМЕЧАНИЕ */}
      <div>
        <label className="mb-1 block text-sm font-medium">Примечание</label>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Что важно учесть…"
        />
      </div>

      {/* ИТОГО */}
      <div className="flex items-center justify-between rounded bg-gray-50 px-4 py-3 text-sm">
        <div className="text-gray-600">Итого</div>
        <div className="text-lg font-semibold">{formatMoney(total)}</div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          disabled={!productId && !serviceId}
        >
          Сохранить черновик
        </button>
      </div>
    </form>
  );
}
