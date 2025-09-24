// app/chat/[id]/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import ChatRoom from './ChatRoom';

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Чат</h1>
      <ChatRoom bookingId={params.id} />
    </div>
  );
}
