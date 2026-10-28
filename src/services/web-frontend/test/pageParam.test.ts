import { describe, expect, it } from 'vitest';
import { clampedPage, MAX_PAGE, pageFromParam } from '../src/lib/pageParam';

describe('pageFromParam', () => {
  it('reads absent, junk, zero and negative as page one', () => {
    for (const raw of [null, '', 'notanumber', '0', '-3', 'Infinity', '-Infinity']) {
      expect(pageFromParam(raw)).toBe(1);
    }
  });

  it('truncates a fractional page the server would refuse as a non-integer', () => {
    expect(pageFromParam('2.7')).toBe(2);
    expect(pageFromParam('0.5')).toBe(1);
  });

  it('caps at the server ceiling instead of sending a page it 422s', () => {
    expect(pageFromParam(String(MAX_PAGE))).toBe(MAX_PAGE);
    expect(pageFromParam(String(MAX_PAGE + 1))).toBe(MAX_PAGE);
    expect(pageFromParam('1e300')).toBe(MAX_PAGE);
  });
});

describe('clampedPage', () => {
  it('leaves an in-range page alone, including the exact last page', () => {
    expect(clampedPage(1, 0, 25)).toBeNull();
    expect(clampedPage(2, 50, 25)).toBeNull();
    expect(clampedPage(3, 51, 25)).toBeNull();
  });

  it('moves a page past the end to the last page, and an empty list to page one', () => {
    expect(clampedPage(3, 50, 25)).toBe(2);
    expect(clampedPage(5, 0, 25)).toBe(1);
    expect(clampedPage(5, 25, 25)).toBe(1);
  });
});
