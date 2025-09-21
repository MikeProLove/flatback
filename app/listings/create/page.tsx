// app/listings/create/page.tsx
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import AuthRequired from '@/components/AuthRequired';
import ListingCreateForm from './ui/ListingCreateForm';

export const dynamic = 'force-dynamic';

export default async function CreateListingPage() {
  const { userId } = auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Новое объявление</h1>
        <AuthRequired redirectTo="/listings/create" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Создать объявление</h1>
      <ListingCreateForm />
    </div>
  );
}
