// app/orders/create/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { listProducts, listServices } from '@/lib/actions/catalog';
import { createOrder } from '@/lib/actions/orders';
import OrderForm from './OrderForm'; // клиентский компонент

export default async function Page() {
  const [products, services] = await Promise.all([listProducts(), listServices()]);

  return (
    <OrderForm
      products={products}
      services={services}
      action={createOrder}   // ← главное: передаём как action, не onSubmit
    />
  );
}
