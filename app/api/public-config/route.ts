// app/api/public-config/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function GET() {
  // важное: в Vercel должна быть переменная NEXT_PUBLIC_MAPTILER_KEY
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
  return NextResponse.json({ maptilerKey: key });
}
