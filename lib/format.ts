// lib/format.ts

// Простая утилита форматирования цен
export function money(
  value: number | string | null | undefined,
  currency: 'RUB' | 'USD' | 'EUR' = 'RUB',
  opts: Intl.NumberFormatOptions = {}
): string {
  let num =
    typeof value === 'string'
      ? Number(value.replace(',', '.'))
      : typeof value === 'number'
      ? value
      : 0;

  if (!Number.isFinite(num)) num = 0;

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...opts,
  }).format(num);
}
