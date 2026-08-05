/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Currency precision utilities to prevent floating-point accumulation drift (IEEE 754 precision issues).
 */

export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toCents(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}

export function addCurrency(...amounts: number[]): number {
  const totalCents = amounts.reduce((acc, val) => acc + toCents(val), 0);
  return centsToAmount(totalCents);
}

export function subtractCurrency(a: number, b: number): number {
  return centsToAmount(toCents(a) - toCents(b));
}

export function multiplyCurrency(amount: number, factor: number): number {
  return roundCurrency(amount * factor);
}

export function formatCurrency(amount: number, currencyCode = 'GHC'): string {
  const rounded = roundCurrency(amount);
  return `${currencyCode} ${rounded.toFixed(2)}`;
}
