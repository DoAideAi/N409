/**
 * The 1-based page a `?page=` query parameter names, as the list routes accept
 * it.
 *
 * The two URL-driven worklists (engagements, users) read it as
 * `Math.max(1, Number(raw) || 1)`, which kept `notanumber` and `0` out but let
 * `?page=1.5` and `?page=200000` through to a server that takes an integer in
 * [1, MAX_PAGE] (`valuation/src/domain/pagination.ts`). Either is a 422, and
 * the reader saw a load failure over a link that only had a bad page number in
 * it. The fraction is truncated and the ceiling applied here, so the fetch is
 * always one the server can answer.
 */
export const MAX_PAGE = 100_000;

export function pageFromParam(raw: string | null): number {
  const n = Math.trunc(Number(raw ?? '1'));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}

/**
 * The page to move a reader to when `page` is past the end of a `total`-row
 * list, or null when it is already in range.
 *
 * Nothing clamps `page` server-side — a page past the end is an empty list —
 * so a bookmarked `?page=5` on a list that has since shrunk to one page showed
 * an empty table, and with one page the pager is not drawn at all, leaving no
 * control that could walk the reader back. The shared `Pagination` component
 * already corrects its owner this way; these two pages hand-roll their pager
 * and did not.
 */
export function clampedPage(page: number, total: number, perPage: number): number | null {
  const last = Math.max(1, Math.ceil(total / perPage));
  return page > last ? last : null;
}
