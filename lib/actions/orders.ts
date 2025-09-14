'use server';

export async function createOrder(formData: FormData) {
  const productId = formData.get('productId') as string;
  // ...валидация, сохранение в БД и т.д.
}
