export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { auth } from '@clerk/nextjs/server';
import ChatClient from './ChatClient';

export default function ChatPage({ params }: { params: { id: string } }) {
  const { userId } = auth();
  return <ChatClient chatId={params.id} me={userId ?? null} />;
}
