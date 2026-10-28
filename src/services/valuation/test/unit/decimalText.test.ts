import { describe, expect, it } from 'vitest';
import { readDecimal } from '../../src/domain/decimalText.js';

describe('readDecimal (C102 M6)', () => {
  it('reads every decimal spelling a person or a provider writes', () => {
    expect(readDecimal('1250')).toBe(1250);
    expect(readDecimal(' 12.5 ')).toBe(12.5);
    expect(readDecimal('.5')).toBe(0.5);
    expect(readDecimal('5.')).toBe(5);
    expect(readDecimal('-3')).toBe(-3);
    expect(readDecimal('+3')).toBe(3);
    expect(readDecimal('2.5e5')).toBe(250000);
    expect(readDecimal('0')).toBe(0);
    expect(readDecimal(7)).toBe(7);
  });

  it('reads a blank as no figure rather than as zero', () => {
    for (const blank of ['', '   ', '\t']) expect(readDecimal(blank)).toBeNull();
  });

  it('refuses the radix literals and words Number() would otherwise read', () => {
    for (const text of ['0x10', '0X1F', '0b11', '0o17', 'Infinity', '-Infinity', 'NaN', '1e400', '1,000']) {
      expect(readDecimal(text)).toBeNull();
    }
  });

  it('refuses a non-finite number and every non-scalar', () => {
    for (const value of [Number.NaN, Infinity, null, undefined, true, [], {}, [5]]) {
      expect(readDecimal(value)).toBeNull();
    }
  });
});
