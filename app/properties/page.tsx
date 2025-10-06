export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Card from '@/components/Card';
import { createProperty, listProperties } from '@/lib/actions/properties';

export default async function Page() {
  const properties = await listProperties();

  async function action(formData: FormData) {
    'use server';
    await createProperty({
      owner_id: String(formData.get('owner_id') || ''),
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      address: String(formData.get('address') || ''),
      price: Number(formData.get('price') || 0),
    });
  }

  return (
    <div className="grid gap-6">
      <Card title="Добавить объект">
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input required name="owner_id" placeholder="owner_id (uuid)" className="border p-2 rounded" />
          <input name="title" placeholder="Название" className="border p-2 rounded" />
          <input name="address" placeholder="Адрес" className="border p-2 rounded sm:col-span-2" />
          <textarea name="description" placeholder="Описание" className="border p-2 rounded sm:col-span-2" />
          <input name="price" type="number" step="0.01" placeholder="Цена" className="border p-2 rounded" />
          <button className="bg-black text-white rounded px-4 py-2">Сохранить</button>
        </form>
      </Card>

      <Card title="Список объектов">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th>Название</th><th>Адрес</th><th>Цена</th><th>Владелец</th><th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.title || '—'}</td>
                <td>{p.address || '—'}</td>
                <td>{Number(p.price || 0).toLocaleString('ru-RU')}</td>
                <td>{p.owner_id?.slice(0, 8)}</td>
                <td>{new Date(p.created_at).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
