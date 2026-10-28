import { describe, expect, it } from 'vitest';
import { describeFetchFailure } from '../src/lib/fetchFailure';

describe('describeFetchFailure', () => {
  it('keeps a message the page wrote itself', () => {
    expect(describeFetchFailure(new Error('This auditor link has expired.'), 'fallback')).toBe(
      'This auditor link has expired.',
    );
  });

  it('replaces the browser’s own errors with the fallback', () => {
    expect(describeFetchFailure(new TypeError('Failed to fetch'), 'fallback')).toBe('fallback');
    expect(describeFetchFailure(new SyntaxError('Unexpected token <'), 'fallback')).toBe('fallback');
    expect(describeFetchFailure(new DOMException('aborted', 'AbortError'), 'fallback')).toBe('fallback');
  });

  it('falls back for an empty message and for a non-Error', () => {
    expect(describeFetchFailure(new Error(''), 'fallback')).toBe('fallback');
    expect(describeFetchFailure('boom', 'fallback')).toBe('fallback');
    expect(describeFetchFailure(undefined, 'fallback')).toBe('fallback');
  });
});
