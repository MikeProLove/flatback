// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: '' }));
  const reply =
    'ИИ-заглушка: сообщение получено. В проде здесь будет анализ документов и автозаполнение полей объявления.';
  return NextResponse.json({ ok: true, echo: text ?? '', reply });
}
