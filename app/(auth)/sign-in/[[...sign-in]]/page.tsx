// app/sign-in/[[...sign-in]]/page.tsx
'use client';

import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="p-6">
      <SignIn />
    </main>
  );
}
