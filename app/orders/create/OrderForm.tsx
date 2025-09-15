'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  stock_qty?: number | null;
  is_active?: boolean | null;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  execution_time_minutes?: number | null;
  is_active?: boolean | null;
};

type Props = {
  products: Product[];
  services: Service[];
};

export default function OrderForm({ products, services }: Props) {
  // локальное состояние списка — берём из пропсов, но сможем дозагрузить из браузера
  const [prodList, setProdList] = useState<Product[]>(products ?? []);
  const [servList, setServList] = useState<Service[]>(services ?? []);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // выбранные позиции
  const [productId, setProductId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [qtyProduct, setQtyProduct] = useState<number>(1);
  const [qtyService, setQtyService] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  // если пропсы пустые (или в них 0 записей) — пробуем дотянуться к БД с клиента
  useEffect(() => {
    async function fetchClientSide() {
      // если уже что-то есть — ничего не делаем
      if ((prodList?.length ?? 0) > 0 || (servList?.length ?? 0) > 0) return;

      try {
        setLoading(true);
        setLoadErr(null);

        // импортируем браузерный клиент в рантайме
        const { getSupabaseBrowser } = await import('@/lib/supabase');
        const sb = getSupabaseBrowser();
        if (!sb) {
          setLoadErr('Нет доступа к Supabase (env-переменные недоступны в браузере).');
          return;
        }

        const [{ data: pData, error: pErr }, { data: sData, error: sErr }] = await Promise.all([
          sb
            .from('products')
            .select('id, name, description, price, category, stock_qty, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          sb
            .from('services')
            .select('id, name, description, price, category, execution_time_minutes, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ]);

        if (pErr) throw pErr;
        if (sErr) throw sErr;

        setProdList(pData ?? []);
        setServList(sData ?? []);
      } catch (e: any) {
        setLoadErr(e?.message ?? 'Не удалось загрузить каталог.');
      } finally {
        setLoading(false);
      }
    }

    fetchClientSide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickedProduct = prodList.find((p) => p.id === productId);
  const pickedService = servList.find((s) => s.id === serviceId);

  const productPrice = (pickedProduct?.price ?? 0) || 0;
  const servicePrice = (pickedService?.price ?? 0) || 0;

  const total = productPrice * (qtyProduct || 0) + servicePrice * (qtyService || 0);

  const money = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
      Number.isFinite(n) ? n : 0
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('ORDER_DRAFT', {
      productId,
      qtyProduct,
      serviceId,
      qtyService,
      note,
      total,
    });
    alert('Черновик заказа сформирован (смотрите консоль). Позже свяжем с БД.');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      {/* статус загрузки/ошибка */}
      {loading && (
        <div className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">Загружаю каталог…</div>
      )}
      {loadErr && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{loadErr}</div>
      )}

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
              {prodList.length ? 'Выберите товар…' : 'Нет товаров'}
            </option>
            {prodList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.price ? `— ${money(Number(p.price))}` : ''}
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
              onChange={(e) => setQtyProduct(Math.max(1, Number(e.target.value) || 1))}
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
              {servList.length ? 'Выберите услугу…' : 'Нет услуг'}
            </option>
            {servList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.price ? `— ${money(Number(s.price))}` : ''}
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
              onChange={(e) => setQtyService(Math.max(1, Number(e.target.value) || 1))}
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
        <div className="text-lg font-semibold">{money(total)}</div>
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
