// lib/types.ts
export type ID = string | number;

export type BaseEntity = {
  id: ID;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Product = BaseEntity & {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  category?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
};

export type Service = BaseEntity & {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  category?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
};

export type OrderItem = {
  kind: 'product' | 'service';
  itemId: ID;
  title?: string | null;
  price?: number | string | null;
  quantity?: number;
  notes?: string | null;
};

export type Order = BaseEntity & {
  customerId?: ID | null;
  items: OrderItem[];
  total?: number | null;
  currency?: string;
  status?: 'draft' | 'pending' | 'paid' | 'cancelled';
};
