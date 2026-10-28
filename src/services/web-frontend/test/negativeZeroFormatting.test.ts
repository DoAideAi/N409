import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatCents,
  formatChargedCents,
  formatExactPercent,
  formatNumber,
  formatPerShare,
  moneyFormatter,
} from '../src/lib/format';
import { formatMoney } from '../src/lib/pipeline';

/**
 * The browser half of `valuation/test/unit/negativeZeroFormatting.test.ts`.
 * `Intl` keeps the sign of `-0` and of a negative that rounds away, so these
 * printed "-$0.00" and "-0.0%" — a credit of nothing — on figures the server
 * already prints unsigned.
 */
describe('a figure that rounds to zero prints without a sign', () => {
  it('money', () => {
    expect(formatCents(-0, 'USD')).toBe('$0.00');
    expect(formatCents(-0.4, 'USD')).toBe('$0.00');
    expect(formatAmount(-0.0000001, 'USD')).toBe('$0.00');
    expect(formatPerShare(-0.00001, 'USD')).toBe('$0.0000');
    expect(formatChargedCents(-0, 'USD')).toBe('$0.00');
    expect(formatMoney(-0.00001, 'USD')).toBe('$0.00');
  });

  it('a plain number', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.0001)).toBe('0');
  });

  it('a rate', () => {
    expect(formatExactPercent(-0)).toBe('0.0%');
    expect(formatExactPercent(-0.0000001)).toBe('0.0000%');
  });

  it('an unparseable currency code still drops the sign', () => {
    expect(moneyFormatter('12', { minimumFractionDigits: 2, maximumFractionDigits: 2 })(-0.001)).toBe('12 0.00');
  });

  it('a negative that survives rounding keeps its sign', () => {
    expect(formatCents(-1, 'USD')).toBe('-$0.01');
    expect(formatPerShare(-0.0001, 'USD')).toBe('-$0.0001');
    expect(formatNumber(-1)).toBe('-1');
    expect(formatExactPercent(-0.001)).toBe('-0.1%');
  });
});
