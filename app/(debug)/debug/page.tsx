'use client';
export default function Debug() {
  return (
    <pre style={{padding:16, background:'#111', color:'#0f0', borderRadius:8}}>
      {JSON.stringify({
        host: typeof window !== 'undefined' ? window.location.host : 'ssr',
        hasPk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        pkPrefix: (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '').slice(0,6),
      }, null, 2)}
    </pre>
  );
}
