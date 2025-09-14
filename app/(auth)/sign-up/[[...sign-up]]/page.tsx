'use client';
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="p-6">
      <SignUp />
    </main>
  );
}
