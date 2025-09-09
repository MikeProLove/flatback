// lib/actions/catalog.ts
export type Product = { id: string; name: string; price: number };
export type Service = { id: string; name: string; price: number };

// Временно возвращаем заглушки, чтобы билд прошёл.
// Потом подключим реальные запросы к Supabase.
export async function listProducts(): Promise<Product[]> {
  return [
    { id: "p1", name: "Товар A", price: 1000 },
    { id: "p2", name: "Товар B", price: 1500 },
  ];
}

export async function listServices(): Promise<Service[]> {
  return [
    { id: "s1", name: "Услуга A", price: 500 },
    { id: "s2", name: "Услуга B", price: 700 },
  ];
}
