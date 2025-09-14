'use client';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Flatback</h1>
      <SignedOut><SignInButton mode="modal" /></SignedOut>
      <SignedIn><UserButton /></SignedIn>
    </div>
  );
}
