export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  // берём ключ из env на сервере и не кешируем ответ
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
  return NextResponse.json(
    { maptilerKey: key },
    { headers: { 'cache-control': 'no-store' } }
  );
}
