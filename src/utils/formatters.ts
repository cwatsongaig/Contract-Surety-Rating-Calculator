export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value: number | null): string {
  if (value == null) return 'N/A';
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function formatPercentInput(value: number): string {
  return (value * 100).toFixed(1);
}

export function parseContractAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  return Number(cleaned) || 0;
}
