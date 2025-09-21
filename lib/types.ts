// lib/types.ts

export type ID = string | number;

export type BaseEntity = {
  id: ID;
  created_at?: string | null;
  updated_at?: string | null;
};

// Универсальная сущность "товар" (недвижимость/продукт каталога)
export type Product = BaseEntity & {
  name?: string | null;
  title?: string | null;
  description?: string | null;

  // Цена может быть числом (рекомендуется) или строкой (если приходит из БД как text/decimal)
  price?: number | string | null;

  category?: string | null;
  city?: string | null;

  // Поддерживаем оба варианта наименования поля изображения
  imageUrl?: string | null;
  image_url?: string | null;

  // Любые дополнительные поля, чтобы TS не падал при расширении схемы
  [key: string]: unknown;
};

// Универсальная сущность "услуга"
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

// Позиция заказа (если потребуется в OrderForm)
export type OrderItem = {
  kind: 'product' | 'service';
  itemId: ID;
  title?: string | null;
  price?: number | string | null;
  quantity?: number; // по умолчанию 1
  notes?: string | null;
};

// Сам заказ (базово; расширяй под свою логику)
export type Order = BaseEntity & {
  customerId?: ID | null;
  items: OrderItem[];
  total?: number | null;
  currency?: string; // "RUB", "EUR" и т.п.
  status?: 'draft' | 'pending' | 'paid' | 'cancelled';
};
