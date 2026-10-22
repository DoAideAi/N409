import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The hand-written head in index.html, which every prerendered page inherits.
 *
 * Two faults sat here unnoticed because neither fails anything a test or a
 * build can see. The structured data named `409a.doaide.com` — a host with no
 * DNS record — so every Organization, WebSite and BreadcrumbList item pointed
 * search engines at a site that does not exist. And a Google Fonts stylesheet
 * was linked for faces this package already self-hosts through @fontsource,
 * which the served CSP (`style-src 'self'`) refused on every page view: one
 * blocked request and a console error per visitor, for nothing.
 */
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

function jsonLdUrls(): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.stringify(JSON.parse(m[1]!), (_key, value: unknown) => {
      if (typeof value === 'string' && /^https?:\/\//.test(value)) urls.push(value);
      return value;
    });
  }
  return urls;
}

describe('index.html head', () => {
  it('points its structured data at the site that is actually served', () => {
    // doaide.com itself is the parent organisation and is meant to be there.
    const own = jsonLdUrls().filter((u) => /^409/.test(new URL(u).host));
    expect(own.length).toBeGreaterThan(0);
    for (const url of own) expect(new URL(url).origin).toBe('https://409.doaide.com');
  });

  it('links no third-party stylesheet — fonts are self-hosted and the CSP is self-only', () => {
    const external = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
      .map((m) => /href="([^"]+)"/.exec(m[0])?.[1] ?? '')
      .filter((href) => /^https?:\/\//.test(href));
    expect(external).toEqual([]);
    expect(html).not.toMatch(/fonts\.googleapis\.com/);
  });
});
