import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Binds a third-party OAuth round trip (accounting, cap-table sync, HRIS) to
 * the browser that started it.
 *
 * The signed `state` proves *this service* minted the flow, and for whom. It
 * did not prove that the browser arriving at the callback is that person's —
 * the callback is unauthenticated by necessity (the session cookie is
 * `SameSite=Strict`, so it is not sent on the provider's cross-site redirect
 * back), and the state was the whole of its check. That is the login-CSRF
 * shape RFC 6749 §10.12 names:
 *
 *   1. An attacker presses Connect on *their own* engagement and copies the
 *      provider's consent URL, signed state and all, instead of following it.
 *   2. They send it to a client. The consent screen is the provider's real
 *      one, so nothing about it is suspicious, and the client approves with
 *      *their* accounting / payroll / cap-table account.
 *   3. The callback verifies the attacker's state, exchanges the client's
 *      code, and stores the client's tokens on the attacker's engagement —
 *      whose next import reads the client's books.
 *
 * So the flow now carries a nonce: a random value set as an httpOnly cookie on
 * the response that starts it, and its SHA-256 inside the signed state. The
 * callback requires the two to match. `SameSite=Lax` because the callback is a
 * top-level cross-site GET navigation, which is exactly what Lax still sends
 * and Strict does not; scoped to the callback's own path, so it travels
 * nowhere else. A victim's browser never holds the attacker's nonce, so step 3
 * is refused.
 *
 * Google sign-in is the same hop with a worse step 3: the attacker completes
 * Google's consent with *their own* account, stops before following the
 * redirect, and sends that callback URL instead. Without the binding it signed
 * the victim into the attacker's N409 account, where whatever the victim then
 * uploaded — a cap table, a set of financials — was the attacker's to read.
 */
export type IntegrationFlow = 'accounting' | 'cap-table-sync' | 'hris' | 'google-sign-in';

/** The cookie a flow's nonce rides in. One per flow, so two flows in two tabs do not clobber each other. */
export function integrationCookieName(flow: IntegrationFlow): string {
  return `n409_oauth_${flow.replace(/-/g, '_')}`;
}

/** The path each flow's provider redirects back to — and the only path its cookie is sent on. */
export function integrationCallbackPath(flow: IntegrationFlow): string {
  return flow === 'google-sign-in' ? '/api/v1/auth/google/callback' : `/api/v1/${flow}/callback`;
}

/**
 * The callback path as the *browser* sees it. A public URL with a prefix
 * (`https://host/n409`) puts the callback under that prefix, and a cookie
 * scoped to the bare path would never be sent back.
 */
function cookiePath(flow: IntegrationFlow, publicBaseUrl: string): string {
  let prefix = '';
  try {
    prefix = new URL(publicBaseUrl).pathname.replace(/\/$/, '');
  } catch {
    // An unparseable base cannot build a redirect URI either; the bare path is
    // as right as anything here.
  }
  return `${prefix}${integrationCallbackPath(flow)}`;
}

/** Matches the longest signed state's lifetime (`signIntegrationState`: 30m; OIDC is 10m). */
const BINDING_TTL_SECONDS = 30 * 60;

function digest(nonce: string): string {
  return createHash('sha256').update(nonce).digest('base64url');
}

/**
 * Mint the nonce, set its cookie on `reply`, and return the hash to sign into
 * the state. `secure` follows the public URL: the cookie comes back through it.
 */
export function bindIntegrationFlow(reply: FastifyReply, flow: IntegrationFlow, publicBaseUrl: string): string {
  const nonce = randomBytes(32).toString('base64url');
  reply.setCookie(integrationCookieName(flow), nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: publicBaseUrl.startsWith('https://'),
    path: cookiePath(flow, publicBaseUrl),
    maxAge: BINDING_TTL_SECONDS,
  });
  return digest(nonce);
}

/**
 * Whether the callback's browser holds the nonce `binding` was minted from.
 * Clears the cookie either way: it is single-use, and a failed attempt should
 * not leave a live one behind.
 */
export function integrationFlowBound(
  req: FastifyRequest,
  reply: FastifyReply,
  flow: IntegrationFlow,
  binding: string | undefined,
  publicBaseUrl: string,
): boolean {
  const nonce = req.cookies?.[integrationCookieName(flow)];
  reply.clearCookie(integrationCookieName(flow), { path: cookiePath(flow, publicBaseUrl) });
  if (!binding || !nonce) return false;
  const presented = Buffer.from(digest(nonce));
  const expected = Buffer.from(binding);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
