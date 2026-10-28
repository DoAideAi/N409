/**
 * The socket's own DNS answer is checked, not only the guard's.
 *
 * The logo fetch and the webhook delivery each resolved the partner's host,
 * refused a private answer, and then called `fetch` — which resolved the host
 * again to connect. A name served with a zero TTL answers those two queries
 * differently on purpose: public for the guard, `169.254.169.254` for the
 * socket. `publicOnly` routes the request through a dispatcher whose lookup is
 * the one the socket uses, so the second answer is held to the same rule.
 */
import { createServer, type Server } from 'node:http';
import type { LookupAddress } from 'node:dns';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fetchPartnerLogo } from '../../src/clients/partnerLogo.js';
import {
  NonPublicAddressError,
  publicOnly,
  publicOnlyLookup,
} from '../../src/clients/publicOnlyDispatcher.js';

type Answer = { err: Error | null; address?: string | LookupAddress[]; family?: number };

function ask(
  lookup: ReturnType<typeof publicOnlyLookup>,
  hostname: string,
  all: boolean,
): Promise<Answer> {
  return new Promise((resolve) => {
    lookup(hostname, { all } as never, ((err: Error | null, address?: string | LookupAddress[], family?: number) =>
      resolve({ err, address, family })) as never);
  });
}

const answering =
  (...addresses: LookupAddress[]) =>
  (_host: string, _opts: unknown, cb: (err: null, a: LookupAddress[]) => void) =>
    cb(null, addresses);

describe('publicOnlyLookup', () => {
  it('refuses a name that resolves to the metadata service', async () => {
    const got = await ask(publicOnlyLookup(answering({ address: '169.254.169.254', family: 4 })), 'rebind.example', false);
    expect(got.err).toBeInstanceOf(NonPublicAddressError);
    expect((got.err as NonPublicAddressError).code).toBe('ENONPUBLIC');
    expect(got.err!.message).toContain('169.254.169.254');
  });

  it('refuses a name with one public and one loopback address, whichever family wins', async () => {
    const lookup = publicOnlyLookup(
      answering({ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }),
    );
    expect((await ask(lookup, 'mixed.example', true)).err).toBeInstanceOf(NonPublicAddressError);
    expect((await ask(lookup, 'mixed.example', false)).err).toBeInstanceOf(NonPublicAddressError);
  });

  it('refuses an empty answer', async () => {
    expect((await ask(publicOnlyLookup(answering()), 'nothing.example', false)).err).toBeInstanceOf(
      NonPublicAddressError,
    );
  });

  it('answers a public name in the shape the socket asked for', async () => {
    const lookup = publicOnlyLookup(answering({ address: '93.184.216.34', family: 4 }));
    expect(await ask(lookup, 'cdn.example', false)).toEqual({ err: null, address: '93.184.216.34', family: 4 });
    expect(await ask(lookup, 'cdn.example', true)).toEqual({
      err: null,
      address: [{ address: '93.184.216.34', family: 4 }],
      family: undefined,
    });
  });

  it('passes a resolver failure through as it came', async () => {
    const fail = new Error('ENOTFOUND');
    const lookup = publicOnlyLookup((_h, _o, cb) => cb(fail as never, []));
    expect((await ask(lookup, 'gone.example', false)).err).toBe(fail);
  });
});

describe('publicOnly, through the real fetch', () => {
  let server: Server;
  let port: number;
  beforeAll(async () => {
    server = createServer((_req, res) => res.end('internal'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('will not open a socket to a name that resolves to loopback', async () => {
    // `localhost` stands in for a rebinding name: the guard's own answer is not
    // consulted here at all, only the one the socket gets.
    const err = await fetch(`http://localhost:${port}/`, publicOnly({})).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { cause?: { code?: string } }).cause?.code).toBe('ENONPUBLIC');
  });

  it('leaves the request otherwise as the caller built it', () => {
    const signal = AbortSignal.timeout(1000);
    const init = publicOnly({ method: 'POST', redirect: 'manual', signal });
    expect(init).toMatchObject({ method: 'POST', redirect: 'manual', signal });
    expect((init as { dispatcher?: unknown }).dispatcher).toBeDefined();
  });
});

describe('the partner logo fetch', () => {
  it('goes through the public-only dispatcher', async () => {
    const png = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), Buffer.alloc(16)]);
    const impl = vi.fn(async () => new Response(png, { status: 200 }));
    const publicDns = async () => ['93.184.216.34'];
    await fetchPartnerLogo('https://cdn.example/logo.png', impl as unknown as typeof fetch, publicDns);
    expect(impl).toHaveBeenCalledTimes(1);
    const init = (impl.mock.calls[0] as unknown as [URL, RequestInit])[1];
    expect((init as { dispatcher?: unknown }).dispatcher).toBe(
      (publicOnly({}) as { dispatcher?: unknown }).dispatcher,
    );
  });
});
