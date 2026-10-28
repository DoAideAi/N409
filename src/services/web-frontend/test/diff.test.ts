import { describe, expect, it } from 'vitest';
import { diffLines, MAX_TABLE_CELLS } from '../src/lib/diff';

describe('diffLines', () => {
  it('marks identical content as all-same', () => {
    const lines = diffLines('a\nb', 'a\nb');
    expect(lines).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'same', text: 'b' },
    ]);
  });

  it('detects an added line', () => {
    expect(diffLines('a\nc', 'a\nb\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'added', text: 'b' },
      { kind: 'same', text: 'c' },
    ]);
  });

  it('detects a removed line', () => {
    expect(diffLines('a\nb\nc', 'a\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'same', text: 'c' },
    ]);
  });

  it('treats a changed line as remove + add', () => {
    const lines = diffLines('hello world', 'hello there');
    expect(lines).toEqual([
      { kind: 'removed', text: 'hello world' },
      { kind: 'added', text: 'hello there' },
    ]);
  });

  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([{ kind: 'same', text: '' }]);
    expect(diffLines('', 'a')).toEqual([
      { kind: 'removed', text: '' },
      { kind: 'added', text: 'a' },
    ]);
  });
});

describe('diffLines on prompts of many short lines', () => {
  const lines = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

  it('matches a long shared head and tail without tabling them', () => {
    const shared = lines('s', 9000);
    const before = [...shared.slice(0, 4500), 'old', ...shared.slice(4500)].join('\n');
    const after = [...shared.slice(0, 4500), 'new', ...shared.slice(4500)].join('\n');
    const out = diffLines(before, after);
    expect(out).toHaveLength(9002);
    expect(out.filter((l) => l.kind !== 'same')).toEqual([
      { kind: 'removed', text: 'old' },
      { kind: 'added', text: 'new' },
    ]);
  });

  it('shows a middle past MAX_TABLE_CELLS as removed then added', () => {
    // 10,000 one-character lines a side is what a 20k-character prompt can hold.
    const before = lines('a', 10_000);
    const after = lines('b', 10_000);
    expect((before.length + 1) * (after.length + 1)).toBeGreaterThan(MAX_TABLE_CELLS);
    const out = diffLines(before.join('\n'), after.join('\n'));
    expect(out).toHaveLength(20_000);
    expect(out[0]).toEqual({ kind: 'removed', text: 'a0' });
    expect(out[9_999]).toEqual({ kind: 'removed', text: 'a9999' });
    expect(out[10_000]).toEqual({ kind: 'added', text: 'b0' });
  });

  it('still aligns a middle under the cap line by line', () => {
    expect(diffLines('x\na\nb\nc\ny', 'x\nb\nd\nc\ny')).toEqual([
      { kind: 'same', text: 'x' },
      { kind: 'removed', text: 'a' },
      { kind: 'same', text: 'b' },
      { kind: 'added', text: 'd' },
      { kind: 'same', text: 'c' },
      { kind: 'same', text: 'y' },
    ]);
  });
});
