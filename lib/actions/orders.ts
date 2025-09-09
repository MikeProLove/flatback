// lib/actions/orders.ts
type CreateOrderInput = {
  product?: { id: string } | null;
  serviceId?: string | null;
  // добавишь поля позже
};

export async function createOrder(input: CreateOrderInput) {
  // TODO: заменить на вызов Supabase RPC/insert
  console.log("createOrder payload:", input);
  return { ok: true };
}
