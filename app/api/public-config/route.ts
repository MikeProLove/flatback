// app/api/public-config/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';
  return Response.json({ maptilerKey: key });
}
