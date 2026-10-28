import { describe, expect, it } from 'vitest';
import { formatCurrency, formatExactPercent, formatPercent } from '../../src/domain/reportSummary.js';
import { formatMoneyCents } from '../../src/domain/billing.js';

/**
 * A figure that rounds to nothing must print as nothing. `Intl` keeps the sign
 * of `-0` and of a small negative amount, so a report or invoice read
 * "-$0.00" — a credit of zero — and a rate read "-0.0%". Found by boundary
 * probing (C101 pass 12, round R435, method M1).
 */
describe('formatCurrency without a negative zero', () => {
  it.each([-0, -0.001, -0.004, -0.00001])('prints %s as an unsigned zero', (value) => {
    expect(formatCurrency(value, 'USD')).toBe('$0.00');
  });

  it('keeps the sign of an amount that survives rounding', () => {
    expect(formatCurrency(-0.005, 'USD')).toBe('-$0.01');
    expect(formatCurrency(-0.0049, 'USD', 4)).toBe('-$0.0049');
    expect(formatCurrency(-1234.5, 'USD')).toBe('-$1,234.50');
  });

  it('honours the fraction digits when zeroing', () => {
    expect(formatCurrency(-0.00001, 'USD', 4)).toBe('$0.0000');
    expect(formatCurrency(-0.00006, 'USD', 4)).toBe('-$0.0001');
  });

  it('leaves positive and zero amounts alone', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    expect(formatCurrency(1234.567, 'USD')).toBe('$1,234.57');
  });
});

describe('formatMoneyCents without a negative zero', () => {
  it('prints zero cents, and -0 cents, unsigned', () => {
    expect(formatMoneyCents(0, 'usd')).toBe('$0.00');
    expect(formatMoneyCents(-0, 'usd')).toBe('$0.00');
  });

  it('keeps the sign of a real refund and the zero-decimal scale', () => {
    expect(formatMoneyCents(-1, 'usd')).toBe('-$0.01');
    expect(formatMoneyCents(-100, 'usd')).toBe('-$1.00');
    expect(formatMoneyCents(100, 'jpy')).toBe('¥100');
    expect(formatMoneyCents(-100, 'jpy')).toBe('-¥100');
  });
});

describe('formatPercent / formatExactPercent without a negative zero', () => {
  it('prints a rate that rounds to nothing unsigned', () => {
    expect(formatPercent(-0.0001)).toBe('0.0%');
    expect(formatPercent(-0.0004)).toBe('0.0%');
    expect(formatPercent(-0)).toBe('0.0%');
    expect(formatPercent(-0.000001, 3)).toBe('0.000%');
    expect(formatExactPercent(-1e-8)).toBe('0.0000%');
    expect(formatExactPercent(-1e-14)).toBe('0.0%');
  });

  it('keeps the sign of a rate that survives rounding', () => {
    expect(formatPercent(-0.0006)).toBe('-0.1%');
    expect(formatPercent(-0.25)).toBe('-25.0%');
    expect(formatExactPercent(-0.0001)).toBe('-0.01%');
    expect(formatExactPercent(-0.3142)).toBe('-31.42%');
  });

  it('is unchanged for ordinary rates', () => {
    expect(formatPercent(0.15)).toBe('15.0%');
    expect(formatExactPercent(0.15)).toBe('15.0%');
    expect(formatExactPercent(0.3142)).toBe('31.42%');
  });
});
