/**
 * A figure someone typed, or a provider wrote, as a string — read as a decimal
 * or not at all (C102 M6).
 *
 * `Number` is not a parser for figures. It reads `''` and `'   '` as 0, so a
 * field left blank becomes a stated zero; and it reads `0x10` as 16, `0b11` as
 * 3 and `0o17` as 15, none of which is a way a person writes a share count or a
 * revenue. Every string-to-figure read on an input path goes through here so
 * that the answer to "is this a number" is the same at validation as it is at
 * the write that follows it.
 *
 * Signed, because a net income or a ledger delta is; the caller decides
 * whether a negative is allowed. Surrounding whitespace is ignored.
 */
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export function readDecimal(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!DECIMAL.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
