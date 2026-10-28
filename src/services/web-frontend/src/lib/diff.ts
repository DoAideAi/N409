/**
 * Minimal line diff (LCS) for the prompt version history (P1 #8). Quadratic in
 * the line count of the part that differs.
 *
 * "Prompts are capped at 20k characters" is not a bound on that: it bounds
 * characters, and the table is lines × lines. A 20k-character prompt of short
 * lines is ten thousand of them, and diffing two of those built a 10,001 ×
 * 10,001 table — 835 MB of heap and most of a second, on an admin page, from
 * two values the API accepts. So the shared head and tail are matched first
 * (an edit to a prompt is almost always a few lines in the middle of it), and
 * a middle still past `MAX_TABLE_CELLS` is shown as removed-then-added rather
 * than aligned line by line.
 */

export interface DiffLine {
  kind: 'same' | 'added' | 'removed';
  text: string;
}

/** About 8 MB of table: a 2,000 × 2,000-line middle is still aligned exactly. */
export const MAX_TABLE_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');

  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) {
    tail++;
  }

  const out: DiffLine[] = a.slice(0, head).map((text) => ({ kind: 'same', text }));
  out.push(...diffMiddle(a.slice(head, a.length - tail), b.slice(head, b.length - tail)));
  for (const text of a.slice(a.length - tail)) out.push({ kind: 'same', text });
  return out;
}

function diffMiddle(a: string[], b: string[]): DiffLine[] {
  if ((a.length + 1) * (b.length + 1) > MAX_TABLE_CELLS) {
    return [
      ...a.map((text): DiffLine => ({ kind: 'removed', text })),
      ...b.map((text): DiffLine => ({ kind: 'added', text })),
    ];
  }
  // lcs[i][j] = LCS length of a[i:] and b[j:]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ kind: 'removed', text: a[i]! });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j]! });
      j++;
    }
  }
  for (; i < a.length; i++) out.push({ kind: 'removed', text: a[i]! });
  for (; j < b.length; j++) out.push({ kind: 'added', text: b[j]! });
  return out;
}
