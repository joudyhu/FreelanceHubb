export function money(value: number | string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('Invalid monetary value');
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
