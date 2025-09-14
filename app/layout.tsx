'use client';

import {
  ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton
} from '@clerk/nextjs';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="ru"><body>
        <header className="p-3 border-b flex gap-3">
          <div className="ml-auto">
            <SignedOut><SignInButton /></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </header>
        {children}
      </body></html>
    </ClerkProvider>
  );
}
