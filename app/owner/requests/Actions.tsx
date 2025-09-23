'use client';

export default function Actions({ id }: { id: string }) {
  async function act(action: 'approve' | 'decline') {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const t = await res.text();
      alert('Ошибка: ' + t);
    } else {
      location.reload();
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => act('approve')} className="px-3 py-1 border rounded-md text-sm text-green-700">
        Принять
      </button>
      <button onClick={() => act('decline')} className="px-3 py-1 border rounded-md text-sm text-red-700">
        Отклонить
      </button>
    </div>
  );
}
