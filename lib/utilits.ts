export function money(n: number | string) {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(v || 0);
}