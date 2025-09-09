'use client';

import { useState } from 'react';
import Card from '@/components/Card';

type Props = {
  products: { id: string; name: string; price: number }[];
  services: { id: string; name: string; price: number }[];
  onSubmit: (payload: any) => Promise<any>;
};

export default function OrderForm({ products, services, onSubmit }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const handleSubmit = async () => {
    await onSubmit({ productId: selectedProduct });
  };

  return (
    <Card title="Создание заказа">
      <div className="space-y-3">
        <select
          value={selectedProduct ?? ''}
          onChange={(e) => setSelectedProduct(e.target.value || null)}
          className="border rounded px-2 py-1"
        >
          <option value="">— выбери товар —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.price}
            </option>
          ))}
        </select>

        <button onClick={handleSubmit} className="border rounded px-3 py-1">
          Создать заказ
        </button>
      </div>
    </Card>
  );
}
