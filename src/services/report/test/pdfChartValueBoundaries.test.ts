import { describe, expect, it } from 'vitest';
import { formatChartValue } from '../src/pdf.js';

/**
 * The default chart label picks its unit from the magnitude of the value and
 * then rounds to that unit's precision. Picking first and rounding second leaves
 * a seam just under each threshold: the value rounds up to the next unit's
 * `1000` and prints in the smaller one, so a $999,999,999 bar read
 * "1000.00m" beside a $1,000,000,000 bar that read "1.00bn" — one number, two
 * spellings, differing by the rounding. (C101 pass 12, round R435, method M1.)
 */
describe('formatChartValue at the unit seams', () => {
  it('promotes to the next unit when rounding would print 1000', () => {
    expect(formatChartValue(999_999_999)).toBe('1.00bn');
    expect(formatChartValue(999_995_000)).toBe('1.00bn');
    expect(formatChartValue(999_999)).toBe('1.00m');
    expect(formatChartValue(999_500)).toBe('1.00m');
    expect(formatChartValue(-999_999_999)).toBe('-1.00bn');
    expect(formatChartValue(-999_999)).toBe('-1.00m');
  });

  it('does not promote while the value still rounds inside its own unit', () => {
    expect(formatChartValue(999_994_999)).toBe('999.99m');
    expect(formatChartValue(999_499)).toBe('999k');
    expect(formatChartValue(10_000)).toBe('10k');
    expect(formatChartValue(1_000_000)).toBe('1.00m');
    expect(formatChartValue(1_000_000_000)).toBe('1.00bn');
  });

  it('rounds half away from zero at the kilo seam the same for either sign', () => {
    expect(formatChartValue(24_500)).toBe('25k');
    expect(formatChartValue(-24_500)).toBe('-25k');
    expect(formatChartValue(-24_499)).toBe('-24k');
  });

  it('never prints a negative zero for a value that rounds to nothing', () => {
    expect(formatChartValue(-0.00001)).toBe('0.0000');
    expect(formatChartValue(-0)).toBe('0.0000');
    expect(formatChartValue(0)).toBe('0.0000');
  });

  it('keeps the existing scale for ordinary values', () => {
    expect(formatChartValue(2_400_000_000)).toBe('2.40bn');
    expect(formatChartValue(24_000_000)).toBe('24.00m');
    expect(formatChartValue(24_000)).toBe('24k');
    expect(formatChartValue(24)).toBe('24.00');
    expect(formatChartValue(0.1234)).toBe('0.1234');
  });
});
