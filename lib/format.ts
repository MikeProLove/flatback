// lib/format.ts
export function money(
  amount: number | null | undefined,
  currency: string = 'RUB'
) {
  const safe = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(safe);
}
