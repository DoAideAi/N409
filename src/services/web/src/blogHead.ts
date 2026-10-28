/**
 * Per-post `<head>` for `/blog/:slug`, filled in at request time.
 *
 * Every other marketing route is prerendered at build time, from metadata the
 * frontend already holds. Blog posts cannot be: they live in Postgres and are
 * written through the admin console, so the build has no list of them. Until
 * this existed each of the fifty-odd posts in the sitemap was served as the
 * generic shell — "DoAide 409A · Valuations", the homepage description and no
 * canonical — to every crawler and link unfurler, none of which run the bundle
 * that would have corrected it. The site was submitting fifty URLs that all
 * claimed to be the same page.
 *
 * The build leaves the untouched shell beside the prerendered pages as
 * `shell.html` (see the prerender plugin in web-frontend/vite.config.ts), and
 * this fills its head-fallback block exactly the way the prerenderer does for
 * the routes it knows. The tag set mirrors `buildHeadTags` and `articleJsonLd`
 * in web-frontend/src/lib — the browser's own `<Seo>` overwrites these once it
 * boots, so the two need to agree, not be the same code.
 *
 * Nothing here can fail a page. No shell, a slow or failing API, an unknown or
 * unpublished slug — each one answers `undefined`, and the caller serves what
 * it would have served anyway.
 */

export const HEAD_FALLBACK_START = '<!--n409:head-fallback-start-->';
export const HEAD_FALLBACK_END = '<!--n409:head-fallback-end-->';
const FALLBACK_BLOCK = new RegExp(`[ \\t]*${HEAD_FALLBACK_START}[\\s\\S]*?${HEAD_FALLBACK_END}`, 'i');

const SITE_NAME = 'DoAide 409A';
/** The statuses that say a post does not exist, and so may be remembered. */
const NOT_FOUND_STATUSES: ReadonlySet<number> = new Set([404, 410]);
const DEFAULT_OG_IMAGE = '/og-image.png';

/** The fields of the public blog API's post this head is built from. */
export interface BlogPostHead {
  slug: string;
  title: string;
  excerpt?: string | null;
  author?: string | null;
  og_image?: string | null;
  published?: boolean;
  published_at?: string | null;
}

/** `/blog/<slug>` → slug, for kebab-case slugs only; anything else is not a post. */
export function blogSlugFrom(url: string): string | undefined {
  const pathname = url.split(/[?#]/, 1)[0]!.replace(/\/+$/, '');
  return /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(pathname)?.[1];
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
// `<` escaped so a title containing `</script>` cannot close the block early.
const serializeJsonLd = (node: unknown): string => JSON.stringify(node).replace(/</g, '\\u003c');
const absolute = (pathOrUrl: string, origin: string): string =>
  /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

export function renderBlogHead(post: BlogPostHead, origin: string): string {
  const url = `${origin}/blog/${post.slug}`;
  const title = `${post.title.trim()} · ${SITE_NAME}`;
  const description = (post.excerpt ?? '').trim() || `${post.title.trim()} — from the ${SITE_NAME} blog.`;
  const image = absolute(post.og_image || DEFAULT_OG_IMAGE, origin);

  const meta = (key: 'name' | 'property', name: string, content: string): string =>
    `<meta ${key}="${name}" content="${escapeHtml(content)}" />`;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: SITE_NAME, url: `${origin}/` },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: `${origin}/` },
    image,
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'Home', item: `${origin}/` },
      { name: 'Blog', item: `${origin}/blog` },
      { name: post.title, item: url },
    ].map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
  };

  return [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:locale', 'en_US'),
    ...(post.published_at ? [meta('property', 'article:published_time', post.published_at)] : []),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image),
    meta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1'),
    `<script type="application/ld+json">${serializeJsonLd(article)}</script>`,
    `<script type="application/ld+json">${serializeJsonLd(breadcrumbs)}</script>`,
  ].join('\n    ');
}

/** The shell with its fallback block replaced, or undefined if it has none. */
export function injectHead(shell: string, head: string): string | undefined {
  if (!FALLBACK_BLOCK.test(shell)) return undefined;
  return shell.replace(FALLBACK_BLOCK, () => `    ${head}`);
}

export interface BlogHeadSourceOptions {
  /** Base URL of the valuation service, which answers the public blog API. */
  valuationUrl: string;
  fetchFn?: typeof fetch;
  /** Per-lookup budget. A crawler waiting on this is waiting on the page. */
  timeoutMs?: number;
  /** How long an answer — including "no such post" — is reused. */
  ttlMs?: number;
  /** Entries kept; the oldest is dropped past this. */
  maxEntries?: number;
  now?: () => number;
}

/**
 * Looks posts up through the public API, with a small time-bounded cache so a
 * crawl of the whole sitemap costs one upstream call per post per TTL rather
 * than one per request.
 */
export function blogHeadSource(opts: BlogHeadSourceOptions): (slug: string) => Promise<BlogPostHead | undefined> {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 1500;
  const ttlMs = opts.ttlMs ?? 5 * 60_000;
  const maxEntries = opts.maxEntries ?? 500;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { at: number; post: BlogPostHead | undefined }>();

  return async (slug) => {
    const hit = cache.get(slug);
    if (hit && now() - hit.at < ttlMs) return hit.post;

    let post: BlogPostHead | undefined;
    let cacheable = true;
    try {
      const res = await fetchFn(`${opts.valuationUrl}/api/v1/blog/posts/${encodeURIComponent(slug)}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const body = (await res.json()) as { post?: BlogPostHead };
        const candidate = body.post;
        // The public route only returns published posts today; checked again
        // so a change there cannot put a draft's title into a crawler's index.
        if (candidate && typeof candidate.title === 'string' && candidate.published !== false) {
          post = { ...candidate, slug };
        }
      } else {
        // Only "there is no such post" is an answer about the post. A 429, a
        // 408 or any 5xx is the API being busy or down, and caching it as
        // "missing" served the generic head for that post for a whole TTL —
        // to the crawl burst most likely to have caused it. Ask again next time.
        cacheable = NOT_FOUND_STATUSES.has(res.status);
        // Unread, the body holds its connection until the response is
        // collected; an outage answered on every request piles those up.
        await res.body?.cancel().catch(() => undefined);
      }
    } catch {
      cacheable = false;
    }

    if (cacheable) {
      cache.delete(slug);
      cache.set(slug, { at: now(), post });
      if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
    }
    return post;
  };
}
