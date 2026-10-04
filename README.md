# astro-intl

Server-side internationalization for Astro 7 — a minimal, zero-dependency equivalent to next-intl, built for maximum runtime performance and smallest bundle size.

- **Zero runtime dependencies** (only peer: `astro@^7`)
- **Zero client JS** — `<Link>` and `<IntlHead>` emit HTML only
- **Tree-shakeable** (`sideEffects: false`, ESM only, subpath exports)
- **Pure request engine** — `resolveRequest` runs in ~5–10µs, shared by middleware, fetch and Hono
- **Automatic URL rewriting** — installs a fetch entrypoint so localized external URLs (`/fr/a-propos`) map to internal routes (`/about`) with correct locale before Astro matches
- **Type-safe** — literal `Locale` types via generated `.d.ts`, dot-path message keys planned via `t()` in next phase
- **Built for SSG/SSR/hybrid** — Plan A prerenderer wrapper already used by tests; static builds warn-free

## Installation

```bash
bun add github:bennajah/astro-intl
# or
npm i github:bennajah/astro-intl#main
# or
pnpm add github:bennajah/astro-intl
```

## Quick start

### 1) Configure routing

In `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import { defineRouting } from 'astro-intl/routing';
import astroIntl from 'astro-intl/integration';

export default defineConfig({
  integrations: [
    astroIntl({
      routing: defineRouting({
        locales: ['en', 'fr'],
        defaultLocale: 'en',
        localePrefix: 'as-needed', // 'never' | 'as-needed' | 'always'
        localeDetection: true,
        localeCookie: { name: 'INTL_LOCALE' },
        pathnames: {
          '/': '/',
          '/about': { en: '/about', fr: '/a-propos' },
          '/blog/[slug]': { en: '/blog/[slug]', fr: '/journal/[slug]' },
        },
      }),
      // locales: { fr: { label: 'Français', lang: 'fr' } }, // optional metadata
    }),
  ],
});
```

Notes:
- `localePrefix: 'never'` requires identical external paths across locales (validated at config time).
- When `localeDetection` is on, `Accept-Language` is consulted only when no locale prefix/cookie/domain gives a result.
- The integration auto-installs a fetch entrypoint (`src/fetch.ts`) if none exists, so external localized URLs are rewritten before routing. If you have your own fetch entrypoint, follow the hint in build logs to add `localizeRequest`.

### 2) Use locale in pages/components

Pages see `Astro.locals.locale` and the **internal** `Astro.locals.pathname` (never prefixed). That means you write pages against unlocalized paths.

```astro
---
// src/pages/about.astro
const { locale, pathname } = Astro.locals;
---
<html lang={locale}>
  <body>
    <p>Locale: {locale} | Internal path: {pathname}</p>
  </body>
</html>
```

### 3) Link between localized pages

Use `<Link>` from `astro-intl/components`. It builds the correct external URL (with prefix/base) and sets `hreflang`.

```astro
---
import { Link } from 'astro-intl/components';
---
<Link href="/about">About (current locale)</Link>
<Link href="/about" locale="fr">À propos</Link>
<Link href="/blog/[slug]" params={{ slug: 'hello' }}>Blog post</Link>
```

Or build URLs programmatically via `getPathname`:

```ts
import { getPathname } from 'astro-intl/navigation';

getPathname('fr', '/about');                // "/fr/a-propos" (or "/a-propos" if never)
getPathname('fr', '/blog/[slug]', { slug: 'x' }); // "/fr/journal/x"
```

### 4) Add alternate hreflangs

`<IntlHead>` emits `<link rel="alternate" hreflang="..." href="...">` for every locale (including `x-default` when appropriate). Put it in `<head>`.

```astro
---
import { IntlHead } from 'astro-intl/components';
---
<head>
  <IntlHead />
  <!-- ... -->
</head>
```

### 5) (Optional) Use middleware/server APIs

- `astro-intl/middleware` exports `onRequest` if you want to compose your own middleware chain (the integration already injects one with `order: 'pre'`).
- `astro-intl/server` gives `getRequestLocale(request)` and `resolveRequestLocale(request)` for server code outside Astro components.
- `astro-intl/fetch` exports `localizeRequest(request)` to localize a raw Request (useful when composing a custom `src/fetch.ts`).
- `astro-intl/hono` exports `i18n()` middleware for Hono apps running Astro.

## Runtime semantics

- **Request rewriting**: `astro-intl/fetch` maps external → internal before routing. The resolved `locale` is carried on the Request via a Symbol (cannot be forged). Middleware reads it and sets `Astro.locals.locale` + `Astro.locals.pathname` (internal).
- **Detection order**: if the external path carries a locale prefix → use it (explicit wins). Else check domain→prefix mapping (if `domains` configured), else cookie (if enabled), else `Accept-Language` (if enabled), else `defaultLocale`.
- **Static paths**: localized static routes live in the `routes` Map (O(1)). Dynamic/catch-all only consulted on miss, in specificity order matching Astro's priority.
- **Prerender**: wrapper expands `getStaticPaths()` per locale/prefix/domain and strips `.html`/honours `base`/`trailingSlash`. Never reads `request.headers` during prerender (avoids Astro warnings).
- **Zero client code**: components import only runtime helpers that don't end up in client bundles (server-only virtual config). `virtual:astro-intl/config` is rejected if imported from `client` environment.

## Project layout expectations

Your pages live at internal paths (e.g. `src/pages/about.astro`), not per-locale duplicates. `pathnames` maps internal→external. For SSG, `getStaticPaths` still returns internal params; the integration expands them.

```astro
---
// src/pages/blog/[slug].astro
export async function getStaticPaths() {
  return [{ params: { slug: 'hello' } }, { params: { slug: 'world' } }];
}
---
```

## Configuration reference (key fields)

- `locales: string[]` (required) — e.g. `['en','fr']`
- `defaultLocale: string` (required)
- `localePrefix?: 'never'|'as-needed'|'always'` (default `'as-needed'`)
- `localeDetection?: boolean` (default `true`)
- `localeCookie?: { name?, maxAge?, sameSite?, secure?, path? }` (default `ASTRO_INTL_LOCALE`, 1y, lax)
- `domains?: { domain: string; defaultLocale?: string; locales?: Partial<Record<string, string>> }[]`
- `pathnames?: Record<string, string | Partial<Record<string, string>>>` — maps internal path → external (per locale). Missing locale keeps internal path.
- `locales?: Record<string, { label?, lang?, direction?, timeZone? }>` — metadata for `IntlHead`/switchers.

## Subpath exports

```ts
import astroIntl from 'astro-intl/integration';        // default integration
import { defineRouting } from 'astro-intl/routing';     // config helper
import navigation from 'astro-intl/navigation';         // getPathname, alternates, locales
import { getPathname, alternates } from 'astro-intl/navigation';
import * as server from 'astro-intl/server';            // getRequestLocale, resolveRequestLocale
import { localizeRequest } from 'astro-intl/fetch';     // custom fetch composition
import { i18n } from 'astro-intl/hono';                 // Hono middleware
import { Link, IntlHead } from 'astro-intl/components'; // Astro components
```

## Notes on messages

The current build provides routing, navigation, components, middleware/fetch/hono surfaces and server utilities. ICU message compilation (`t()` with interpolation/plurals), `getTranslations`, message modules and the `astro-intl check` CLI are planned next (Phase 3+ per the spec) while keeping the same zero-dependency, build-time-only ICU→AST approach.

## Development

```bash
npm run build        # tsc + copy .astro
npm run typecheck    # strict noEmit
npm run test:unit    # node:test core (42)
npm run test:integration # node:test real Astro builds (14)
npm run size         # min+gzip vs budgets
npm run bench        # µs vs baseline
npm run check        # all of the above
```

## License

MIT
