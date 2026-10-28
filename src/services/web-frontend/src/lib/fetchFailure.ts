/**
 * The message to show for a failure on a page with its own `fetch` transport
 * (the public share, auditor and intake pages, which have no session to send).
 *
 * Its own module rather than `lib/api.ts` because the portal pages must not
 * import the session client at all (`sessionDeathCensus.test.ts`).
 *
 * Those pages throw `new Error(detail)` on a non-2xx and print `err.message` in
 * the catch — which also caught the browser's own errors and printed them: a
 * rejected `fetch` is a `TypeError` reading "Failed to fetch" / "Load failed",
 * and an HTML body where JSON was expected a `SyntaxError` reading "Unexpected
 * token <". Only a plain `Error` is one the page wrote; anything else gets
 * `fallback`.
 */
export function describeFetchFailure(err: unknown, fallback: string): string {
  return err instanceof Error && err.name === 'Error' && err.message ? err.message : fallback;
}
