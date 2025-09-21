// lib/types.ts

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;             // NUMERIC из Postgres может прийти null
  category?: string | null;
  stock_qty?: number | null;
  is_active?: boolean | null;
};

export type Service = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;             // NUMERIC → может быть null
  category?: string | null;
  execution_time_minutes?: number | null;
  is_active?: boolean | null;
};
