// app/listings/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import FavoriteToggle from './ui/FavoriteToggle';
import BookWidget from './ui/BookWidget';
import Amenities from './ui/Amenities';
import PhotoLightbox from './ui/PhotoLightbox';
import ChatOpenButton from './ui/ChatOpenButton';

type ListingRow = {
  id: string;
  owner_id: string | null;
  user_id: string | null;

  status: 'draft' | 'published';
  title: string | null;
  description: string | null;

  price: number | null;
  deposit: number | null;
  currency: 'RUB' | 'USD' | 'EUR' | null;

  city: string | null;
  address: string | null;
  rooms: number | null;
  area_total: number | null;
  floor: number | null;
  floors_total: number | null;

  lat: number | null;
  lng: number | null;

  building_type: string | null;
  renovation: string | null;
  furniture: string | null;
  appliances: string | null;
  balcony: string | null;
  bathroom: string | null;
  ceiling_height: number | null;
  parking: string | null;
  internet: string | null;
  concierge: string | null;
  security: string | null;
  lift: string | null;
  utilities_included: boolean | null;
  pets_allowed: boolean | null;
  kids_allowed: boolean | null;
  metro: string | null;
  metro_distance_min: number | null;

  created_at: string;
};

type PhotoRow = {
  id: string;
  url: string | null;
  storage_path: string | null;
  sort_order: number | null;
};

function money(n?: number | null, cur: string = 'RUB') {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur as any,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} ₽`;
  }
}

export default async function ListingPage({analysis
