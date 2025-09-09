import Card from '@/components/Card';
import { listProducts, listServices } from '@/lib/actions/catalog';
import { createOrder } from '@/lib/actions/orders';
import { useState } from 'react';

export default async function Page() {
  const [products, services] = await Promise.all([listProducts(), listServices()]);

  async function action(formData: FormData) {
    'use server';
    const products: any[] = JSON.parse(String(formData.get('products') || '[]'));
    const services: any[] = JSON.parse(String(formData.get('services') || '[]'));
    const tenant_id = (formData.get('tenant_id') || '') as string || null;
    const owner_id = (formData.get('owner_id') || '') as string || null;
    return await createOrder({ tenant_id, owner_id, products, services });
  }

  return (
    <div className="grid gap-6">
      <Card title="Собрать заказ">
        <OrderBuilder products={products} services={services} action={action} />
      </Card>
    </div>
  );
}

function toItem(id: string, price: number) { return { id, qty: 1, price }; }

function OrderBuilder({ products, services, action }: any) {
  'use client';
  const [ps, setPs] = useState<any[]>([]);
  const [ss, setSs] = useState<any[]>([]);
  const [tenant, setTenant] = useState('');
  const [owner, setOwner] = useState('');
  const amount = [...ps, ...ss].reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={tenant} onChange={e=>setTenant(e.target.value)} className="border p-2 rounded" placeholder="tenant_id (uuid)" />
        <input value={owner} onChange={e=>setOwner(e.target.value)} className="border p-2 rounded" placeholder="owner_id (uuid)" />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <div className="font-semibold mb-2">Товары</div>
          <ul className="space-y-2">
            {products.map((p:any)=> (
              <li key={p.id} className="flex items-center justify-between border rounded p-2">
                <span>{p.name}</span>
                <button type="button" className="px-2 py-1 rounded bg-black text-white"
                        onClick={()=>setPs([...ps, toItem(p.id, Number(p.price))])}>Добавить</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Услуги</div>
          <ul className="space-y-2">
            {services.map((s:any)=> (
              <li key={s.id} className="flex items-center justify-between border rounded p-2">
                <span>{s.name}</span>
                <button type="button" className="px-2 py-1 rounded bg-black text-white"
                        onClick={()=>setSs([...ss, toItem(s.id, Number(s.price))])}>Добавить</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Позиции</div>
        <ul className="divide-y">
          {[...ps.map(p=>({ ...p, kind:'product'})), ...ss.map(s=>({ ...s, kind:'service'}))].map((i,idx)=> (
            <li key={idx} className="py-2 flex items-center justify-between">
              <span>{i.kind === 'product' ? 'Товар' : 'Услуга'} — {i.qty} × {i.price}</span>
              <button type="button" className="text-red-600"
                      onClick={()=>{
                        if(i.kind==='product') setPs(ps.filter((_,k)=>k!==ps.indexOf(i)));
                        else setSs(ss.filter((_,k)=>k!==ss.indexOf(i)));
                      }}>Удалить</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 font-semibold">Итого: {amount.toLocaleString('ru-RU')} ₽</div>
      </div>

      <input type="hidden" name="products" value={JSON.stringify(ps)} />
      <input type="hidden" name="services" value={JSON.stringify(ss)} />
      <input type="hidden" name="tenant_id" value={tenant} />
      <input type="hidden" name="owner_id" value={owner} />

      <button className="bg-black text-white rounded px-4 py-2">Создать заказ</button>
    </form>
  );
}