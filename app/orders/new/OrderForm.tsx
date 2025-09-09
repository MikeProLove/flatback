'use client';

import { useState } from 'react';
import Card from '@/components/Card';

export default function OrderForm({ products, services, onSubmit }: any) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleSubmit = async () => {
    await onSubmit({ product: selectedProduct });
  };

  return (
    <div>
      <h2>Создание заказа</h2>
      <Card title="Пример карточки">Контент</Card>
      <button onClick={handleSubmit}>Создать заказ</button>
    </div>
  );
}
