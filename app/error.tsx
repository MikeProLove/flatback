'use client';

export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  console.error('[GlobalError]', error);
  return (
    <html>
      <body>
        <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Попробуйте обновить страницу или вернуться на главную.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => reset()} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
              Обновить
            </button>
            <a href="/" style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, textDecoration: 'none' }}>
              На главную
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
