'use client';

import { useState } from 'react';
import Card from '@/components/Card';

type Props = {
  products: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  action: (formData: FormData) => Promise<any>; // сервер-экшен приходит сюда
};

export default function OrderForm({ products, services, action }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div>
      <h1>Новый заказ</h1>
      <Card>
        <form action={action}>
          {/* Пример выбора товара */}
          <select
            name="productId"                   // ВАЖНО: имя нужно сервер-экшену
            value={selectedProduct ?? ''}
            onChange={(e) => setSelectedProduct(e.target.value)}
            required
          >
            <option value="" disabled>Выбери товар</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* добавь поля для services по аналогии, например чекбоксы */}
          {/* <input type="hidden" name="..." value="..." /> */}

          <button type="submit">Создать заказ</button>
        </form>
      </Card>
    </div>
  );
}
