import { listProducts, listServices } from '@/lib/actions/catalog';
import { createOrder } from '@/lib/actions/orders';
import OrderForm from './OrderForm'; // 👈 клиентский компонент

export default async function Page() {
  const [products, services] = await Promise.all([
    listProducts(),
    listServices(),
  ]);

  return (
    <OrderForm products={products} services={services} onSubmit={createOrder} />
  );
}
