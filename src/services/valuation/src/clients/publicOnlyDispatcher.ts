/**
 * An HTTP dispatcher that will only open a socket to a public address.
 *
 * Both outbound fetches of a stored, caller-supplied URL — a partner's logo
 * (clients/partnerLogo.ts) and a partner's webhook (hooks/partnerWebhooks.ts) —
 * resolve the host and refuse a private answer before they call `fetch`. Then
 * `fetch` resolves the host again to connect, and nothing checks *that* answer.
 * A name served from the caller's own DNS with a zero TTL answers the first
 * query with a public address and the second with `169.254.169.254`: the guard
 * passes, and the socket lands on the metadata service or anything else inside
 * the network. Both files said as much ("a residual race … which `fetch` gives
 * no way to do"), and it is not a race an attacker has to win by luck — the
 * answers are theirs to choose, query by query.
 *
 * `fetch` does give a way: its `dispatcher`. The lookup below is the one the
 * socket is opened with, so the address it approves is the address dialled.
 * The pre-checks stay — they refuse an IP literal (which never reaches a
 * lookup) and give a precise reason — and this is what makes their answer the
 * one that holds.
 */
import { lookup as dnsLookup, type LookupAddress, type LookupAllOptions } from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent } from 'undici';
import { isPrivateAddress } from '../domain/privateAddress.js';

type LookupAll = (
  hostname: string,
  options: LookupAllOptions,
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
) => void;

/** The refusal, as a transport error: `fetch` rejects with it as the `cause`. */
export class NonPublicAddressError extends Error {
  readonly code = 'ENONPUBLIC';
}

/**
 * `dns.lookup`, refusing an answer that contains any non-public address.
 *
 * Any, not the chosen one: which family the socket tries first is not this
 * function's decision, and a name with one public A record and a loopback AAAA
 * record would otherwise connect wherever the runtime preferred.
 */
export function publicOnlyLookup(resolve: LookupAll = dnsLookup as LookupAll): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, '', 0);
      const blocked = addresses.find((a) => isPrivateAddress(a.address));
      if (addresses.length === 0 || blocked) {
        const why = blocked
          ? `${hostname} resolves to the non-public address ${blocked.address}`
          : `${hostname} resolved to no addresses`;
        return callback(new NonPublicAddressError(why), '', 0);
      }
      // `net` asks for every address when it is racing families and for one
      // otherwise; the callback's shape follows the question.
      if ((options as { all?: boolean }).all) {
        return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses);
      }
      return callback(null, addresses[0]!.address, addresses[0]!.family);
    });
  };
}

const PUBLIC_ONLY_DISPATCHER = new Agent({ connect: { lookup: publicOnlyLookup() } });

/**
 * `init` with the public-only dispatcher, for any `fetch` of a caller-supplied
 * URL.
 *
 * The cast is the whole reason this is a function. The `Agent` comes from the
 * `undici` package and global `fetch` is typed by the copy of undici bundled
 * with Node; the two declarations of `Dispatcher` differ by a field nothing on
 * this path reads, and at runtime the bundled `fetch` drives this agent like
 * its own (test/unit/publicOnlyDispatcher.test.ts makes a real request).
 */
export function publicOnly(init: RequestInit): RequestInit {
  return { ...init, dispatcher: PUBLIC_ONLY_DISPATCHER } as unknown as RequestInit;
}
