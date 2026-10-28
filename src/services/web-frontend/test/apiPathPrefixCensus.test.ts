import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `api()`, `apiDownload()` and friends prepend `/api/v1` themselves. A call
 * site that passes a path already carrying it requests `/api/v1/api/v1/...`,
 * which is a 404 — the newsletter signup did exactly that, and its test mocked
 * `api` away so nothing noticed.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../src');

function sources(dir: string): Array<{ rel: string; text: string }> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sources(full);
    return /\.tsx?$/.test(e.name) ? [{ rel: path.relative(SRC, full), text: readFileSync(full, 'utf8') }] : [];
  });
}

describe('api client paths', () => {
  it('never pass /api to a helper that already prefixes /api/v1', () => {
    const doubled = sources(SRC).flatMap(({ rel, text }) =>
      [...text.matchAll(/\bapi(?:Download|Upload)?\s*(?:<[^>(]*>)?\(\s*['`]\/api\//g)].map(() => rel),
    );
    expect(doubled).toEqual([]);
  });
});
