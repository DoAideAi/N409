import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  HEAD_FALLBACK_END,
  HEAD_FALLBACK_START,
  blogHeadSource,
  blogSlugFrom,
  injectHead,
  renderBlogHead,
  type BlogPostHead,
} from '../src/blogHead.js';

const ORIGIN = 'https://409.doaide.com';
const SHELL =
  '<!doctype html><html><head>' +
  `${HEAD_FALLBACK_START}<title>DoAide 409A · Valuations</title>${HEAD_FALLBACK_END}` +
  '<script>var theme = 1;</script></head><body><div id="root"></div></body></html>';

const POST: BlogPostHead = {
  slug: 'what-is-a-409a-valuation',
  title: 'What a 409A valuation is, and what it is for',
  excerpt: 'An independent appraisal of your common stock.',
  author: 'The N409 team',
  og_image: null,
  published: true,
  published_at: '2026-02-22T17:33:37.021Z',
};

const answering = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

function rootWith(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'n409-blog-'));
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

describe('blogSlugFrom', () => {
  it('takes the slug from a post URL, ignoring a query string and a trailing slash', () => {
    expect(blogSlugFrom('/blog/what-is-a-409a-valuation')).toBe('what-is-a-409a-valuation');
    expect(blogSlugFrom('/blog/what-is-a-409a-valuation/?utm_source=x')).toBe('what-is-a-409a-valuation');
  });

  it('is not fooled by the index, nested paths or anything that is not a kebab-case slug', () => {
    for (const url of ['/blog', '/blog/', '/blog/a/b', '/blog/Upper-Case', '/blog/..%2f..', '/blogger/x', '/blog/-x']) {
      expect(blogSlugFrom(url)).toBeUndefined();
    }
  });
});

describe('blogSlugFrom length', () => {
  it('stops at the longest slug the blog API would look up', () => {
    const longest = 'a'.repeat(100);
    expect(blogSlugFrom(`/blog/${longest}`)).toBe(longest);
    expect(blogSlugFrom(`/blog/${longest}b`)).toBeUndefined();
    expect(blogSlugFrom(`/blog/${'ab-'.repeat(2000)}x`)).toBeUndefined();
  });
});

describe('renderBlogHead', () => {
  const head = renderBlogHead(POST, ORIGIN);

  it("gives the post its own title, description and canonical instead of the shell's", () => {
    expect(head).toContain('<title>What a 409A valuation is, and what it is for · DoAide 409A</title>');
    expect(head).toContain('<meta name="description" content="An independent appraisal of your common stock." />');
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/blog/what-is-a-409a-valuation" />`);
    expect(head).toContain('<meta property="og:type" content="article" />');
    expect(head).toContain(`<meta property="og:image" content="${ORIGIN}/og-image.png" />`);
  });

  it('carries BlogPosting and BreadcrumbList structured data', () => {
    const nodes = [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]!),
    );
    expect(nodes.map((n) => n['@type'])).toEqual(['BlogPosting', 'BreadcrumbList']);
    expect(nodes[0].headline).toBe(POST.title);
    expect(nodes[0].datePublished).toBe(POST.published_at);
    expect(nodes[0].author).toEqual({ '@type': 'Person', name: 'The N409 team' });
    expect(nodes[1].itemListElement.map((c: { item: string }) => c.item)).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/blog`,
      `${ORIGIN}/blog/what-is-a-409a-valuation`,
    ]);
  });

  it('escapes a hostile title in markup and cannot be closed out of its script block', () => {
    const evil = renderBlogHead({ ...POST, title: '"><script>alert(1)</script>' }, ORIGIN);
    expect(evil).not.toContain('<script>alert(1)');
    expect(evil).toContain('&quot;&gt;&lt;script&gt;');
    expect(evil.match(/<\/script>/g)).toHaveLength(2);
  });

  it('falls back to a description of its own when the post has no excerpt', () => {
    expect(renderBlogHead({ ...POST, excerpt: '' }, ORIGIN)).toContain(
      'content="What a 409A valuation is, and what it is for — from the DoAide 409A blog."',
    );
  });
});

describe('injectHead', () => {
  it('replaces the fallback block and leaves the rest of the shell alone', () => {
    const html = injectHead(SHELL, '<title>Post</title>')!;
    expect(html).toContain('<title>Post</title>');
    expect(html).not.toContain('DoAide 409A · Valuations');
    expect(html).toContain('<script>var theme = 1;</script>');
  });

  it('does not treat $ sequences in the head as replacement patterns', () => {
    expect(injectHead(SHELL, "<title>$& and $' cost</title>")).toContain("<title>$& and $' cost</title>");
  });

  it('answers undefined for a shell with no block to fill', () => {
    expect(injectHead('<html></html>', '<title>x</title>')).toBeUndefined();
  });
});

describe('blogHeadSource', () => {
  it('asks the public blog API and reuses the answer within the TTL', async () => {
    const fetchFn = answering({ post: POST });
    let now = 0;
    const lookup = blogHeadSource({ valuationUrl: 'http://v', fetchFn, ttlMs: 1000, now: () => now });

    expect((await lookup(POST.slug))?.title).toBe(POST.title);
    expect(await lookup(POST.slug)).toBeDefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0]![0])).toBe('http://v/api/v1/blog/posts/what-is-a-409a-valuation');

    now = 1001;
    await lookup(POST.slug);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('remembers a missing post, but not an outage', async () => {
    const missing = answering({ error: 'not found' }, 404);
    const lookupMissing = blogHeadSource({ valuationUrl: 'http://v', fetchFn: missing });
    expect(await lookupMissing('gone')).toBeUndefined();
    await lookupMissing('gone');
    expect(missing).toHaveBeenCalledTimes(1);

    const down = answering({}, 503);
    const lookupDown = blogHeadSource({ valuationUrl: 'http://v', fetchFn: down });
    await lookupDown('x');
    await lookupDown('x');
    expect(down).toHaveBeenCalledTimes(2);
  });

  it.each([429, 408, 400, 502])('does not remember a %i as a missing post', async (status) => {
    const busy = answering({ error: 'busy' }, status);
    const lookup = blogHeadSource({ valuationUrl: 'http://v', fetchFn: busy });
    await lookup('x');
    await lookup('x');
    expect(busy).toHaveBeenCalledTimes(2);
  });

  it('remembers a 410 as gone', async () => {
    const gone = answering({ error: 'gone' }, 410);
    const lookup = blogHeadSource({ valuationUrl: 'http://v', fetchFn: gone });
    await lookup('x');
    await lookup('x');
    expect(gone).toHaveBeenCalledTimes(1);
  });

  it('releases the body of a response it does not read', async () => {
    const cancel = vi.fn(async () => undefined);
    const fetchFn = vi.fn(async () => {
      const res = new Response('down', { status: 503 });
      vi.spyOn(res.body!, 'cancel').mockImplementation(cancel);
      return res;
    });
    await blogHeadSource({ valuationUrl: 'http://v', fetchFn })('x');
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('never surfaces an unpublished post', async () => {
    const lookup = blogHeadSource({ valuationUrl: 'http://v', fetchFn: answering({ post: { ...POST, published: false } }) });
    expect(await lookup(POST.slug)).toBeUndefined();
  });

  it('swallows a network failure', async () => {
    const lookup = blogHeadSource({
      valuationUrl: 'http://v',
      fetchFn: vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    });
    expect(await lookup(POST.slug)).toBeUndefined();
  });

  it('drops the oldest entry past its size bound', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const slug = String(url).split('/').pop()!;
      return new Response(JSON.stringify({ post: { ...POST, slug, title: slug } }), { status: 200 });
    });
    const lookup = blogHeadSource({ valuationUrl: 'http://v', fetchFn, maxEntries: 2 });
    await lookup('a');
    await lookup('b');
    await lookup('c');
    await lookup('a');
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});

describe('GET /blog/:slug through the web service', () => {
  const root = () =>
    rootWith({
      'index.html': '<!doctype html><title>Home</title>HOME',
      'shell.html': SHELL,
      'prerender-manifest.json': JSON.stringify({ routes: { '/': 'index.html' } }),
    });

  it('serves the post with its own head', async () => {
    const app = buildApp({ staticRoot: root(), blogFetch: answering({ post: POST }), siteUrl: ORIGIN });
    const res = await app.inject({ method: 'GET', url: '/blog/what-is-a-409a-valuation' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.body).toContain('<title>What a 409A valuation is, and what it is for · DoAide 409A</title>');
    expect(res.body).toContain(`<link rel="canonical" href="${ORIGIN}/blog/what-is-a-409a-valuation" />`);
    await app.close();
  });

  it('serves the ordinary page when the post cannot be found', async () => {
    const app = buildApp({ staticRoot: root(), blogFetch: answering({}, 404) });
    const res = await app.inject({ method: 'GET', url: '/blog/no-such-post' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('HOME');
    await app.close();
  });

  it('does not consult the blog API for any other route', async () => {
    const blogFetch = answering({ post: POST });
    const app = buildApp({ staticRoot: root(), blogFetch });
    await app.inject({ method: 'GET', url: '/dashboard' });
    await app.inject({ method: 'GET', url: '/blog' });
    expect(blogFetch).not.toHaveBeenCalled();
    await app.close();
  });

  it('serves posts as before on a build that has no shell.html', async () => {
    const blogFetch = answering({ post: POST });
    const app = buildApp({
      staticRoot: rootWith({ 'index.html': '<!doctype html>HOME' }),
      blogFetch,
    });
    const res = await app.inject({ method: 'GET', url: '/blog/what-is-a-409a-valuation' });
    expect(res.body).toContain('HOME');
    expect(blogFetch).not.toHaveBeenCalled();
    await app.close();
  });
});
