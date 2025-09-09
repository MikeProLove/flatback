// lib/actions/orders.ts
type CreateOrderInput = {
  productId?: string | null;
  serviceId?: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  // TODO: позже подключим Supabase
  console.log('createOrder payload:', input);
  return { ok: true };
}
