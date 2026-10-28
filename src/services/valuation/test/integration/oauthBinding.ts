import { createHash, randomBytes } from 'node:crypto';
import type { LightMyRequestResponse } from 'fastify';
import type { IntegrationState, JwtConfig } from '../../src/auth/jwt.js';
import { integrationCookieName, type IntegrationFlow } from '../../src/auth/integrationBinding.js';

/**
 * The browser half of an integration OAuth hop (auth/integrationBinding.ts).
 *
 * A callback is honoured only from the browser that pressed Connect, so a test
 * driving one has to carry what that browser would: the nonce cookie set on
 * the `/connect` response, sent back on the callback.
 */

/** The `cookie` header a browser would send to the callback after this `/connect` response. */
export function bindingCookie(connect: LightMyRequestResponse, flow: IntegrationFlow): { cookie: string } {
  const name = integrationCookieName(flow);
  const set = connect.cookies.find((c) => c.name === name);
  if (!set) throw new Error(`/connect set no ${name} cookie`);
  return { cookie: `${name}=${set.value}` };
}

/**
 * A state signed directly — for tests that mint one without `/connect` — bound
 * to a fresh nonce, with the cookie that nonce rides in.
 */
export async function boundState(
  sign: (s: IntegrationState, cfg: JwtConfig) => Promise<string>,
  s: Omit<IntegrationState, 'binding'>,
  cfg: JwtConfig,
  flow: IntegrationFlow,
): Promise<{ state: string; headers: { cookie: string } }> {
  const nonce = randomBytes(32).toString('base64url');
  const binding = createHash('sha256').update(nonce).digest('base64url');
  return {
    state: await sign({ ...s, binding }, cfg),
    headers: { cookie: `${integrationCookieName(flow)}=${nonce}` },
  };
}
