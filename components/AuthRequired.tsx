// components/AuthRequired.tsx
'use client';

import React from 'react';
import { SignInButton } from '@clerk/nextjs';

type Props = {
  redirectTo: string;
  note?: string;
};

export default function AuthRequired({ redirectTo, note }: Props) {
  return (
    <div className="rounded-2xl border p-6">
      <p className="mb-2">
        {note ?? 'Доступно только авторизованным пользователям.'}
      </p>
      <div className="text-sm">
        <SignInButton mode="redirect" forceRedirectUrl={redirectTo}>
          <span className="underline cursor-pointer">Войти</span>
        </SignInButton>
      </div>
    </div>
  );
}
