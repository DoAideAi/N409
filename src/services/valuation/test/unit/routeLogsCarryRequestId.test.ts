import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Route code logs on the request's logger, never the app's.
 *
 * Fastify's `req.log` is a child of `app.log` with the request id bound, so a
 * line written through it can be joined to the access log, the problem
 * document the caller got, and every other line the same request wrote.
 * `app.log` inside a handler drops that id: twenty-two places in `src/routes`
 * logged that way — handed to the state-change emailer, the partner-webhook
 * fan-out, the sweep locks — so the warning that said why a request half
 * failed could not be traced back to the request.
 *
 * Comments may still mention `app.log`; code may not. A helper with no
 * request in reach takes a `log` parameter from its caller instead.
 */
const ROUTES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/routes');

describe('route logging', () => {
  it('never uses app.log in route code', () => {
    const offenders: string[] = [];
    for (const file of readdirSync(ROUTES).filter((f) => f.endsWith('.ts'))) {
      readFileSync(path.join(ROUTES, file), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
          if (/\bapp\.log\b/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
