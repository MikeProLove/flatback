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
      <Card />
      <button onClick={handleSubmit}>Создать заказ</button>
    </div>
  );
}
