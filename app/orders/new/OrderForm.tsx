// app/orders/new/OrderForm.tsx
'use client';

import { useState } from 'react';
import Card from '@/components/Card';

export default function OrderForm({ products, services }: any) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div>
      <Card />
      {/* остальной интерфейс формы */}
    </div>
  );
}
