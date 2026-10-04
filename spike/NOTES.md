# Phase 0 spike results

Run with `npm run spike` (`node --experimental-strip-types spike/run.ts`).

Toolchain: Node 24.21.0, Astro 7.3.5, Vite 8.3.2 (rolldown-vite).

| Spike | Question | Result |
| --- | --- | --- |
| a | Can `setPrerenderer` expand internal static paths into localized output paths? | **PASS** 13/13 — Plan A works, no fallback needed |
| d | Can the no-argument locale API use `AsyncLocalStorage`? | **PASS** 9/9 |
| e | Virtual modules per Vite environment + `injectTypes` | **PASS** 12/12 |
| f | `.astro` components and server-only JS through the `exports` map | **PASS** 8/8 |

**42/42 checks pass.**

## a — prerender expansion (Plan A)

`astro:build:start` → `setPrerenderer(wrapper)` works. Astro derives **both** the output
file path and the request URL from the `pathname` returned by `getStaticPaths()`,
which is exactly the hook needed to emit `fr/articles/a/index.html` from
`src/pages/blog/[slug].astro`.

Findings that change the implementation:

1. **`config.base` is never `''`** — Astro normalizes it to at least `'/'`.
   The wrapper must treat `'/'` as "no base" or it will slice the leading `/`
   off every pathname (`/blog/a/` → `blog/a/` → resolved relative to the current
   directory → `/blog/blog/a/`). This was the cause of the dynamic-route failure.
2. **`base` must be stripped by hand in `render()`**, then re-prefixed with `/`.
3. **`build.format: 'file'` puts `.html` in the request URL.** The wrapper must
   strip a trailing `.html` before mapping external → internal.
4. **Never read `request.headers` inside the prerenderer wrapper.** Astro's
   `createRequest({isPrerendered: true})` redefines `request.headers` with a getter
   that logs a warning on *every* access. Copying headers forward (even to add our
   own locale header) produced one warning per prerendered page. Building a fresh
   `Headers` with only our internal header removes the warning entirely — verified.
5. **Locale reaches pages through `Astro.locals`.** `Astro.url.pathname` inside the
   page is the *internal* path; that is what we want (the page is `/blog/[slug]`).
6. **`trailingSlash`, `build.format` and `base` are all honoured** for localized
   output paths; `base` never leaks into the emitted directory layout.
7. **Hybrid works.** `output: 'server'` + adapter prerenderer: our wrapper composes
   with Astro's adapter prerenderer, prerendered pages land in `dist/client/…`, and
   on-demand pages are untouched.
8. **`setPrerenderer` is ignored unless the integration is registered in
   `settings.config.integrations`** (i.e. actually added to `astro.config`).

## d — AsyncLocalStorage

`src/als.ts` (the real module, not a copy) verified on Node 24 and Bun 1.x:
store survives `await`, no leak outside `run()`, and two overlapping requests with
different locales never observe each other's value.

When `node:async_hooks` cannot be resolved (forced with `module.registerHooks`,
standing in for workerd without `nodejs_compat`), importing the module does **not**
throw; `hasAmbientStore()` returns `false` and only calling a no-argument API throws
one descriptive `Error` naming the explicit alternatives.

Decision: keep the guarded import behind top-level `await` in a module nothing else
imports, so explicit-context bundles never include it.

## e — Vite environments and types

- Environment names observed: **`prerender`** for prerendered pages,
  **`ssr`** for on-demand pages in a `output: 'server'` build.
- `resolveId` can read `this.environment.name` and refuse the client:
  a client-environment import throws a named error.
- The virtual module is **inlined at build time** — no runtime import survives in
  the server bundle.
- `injectTypes` lives on **`astro:config:done`**, not `astro:config:setup`.
  Files land in `.astro/integrations/<integration-name>/<file>.d.ts` and Astro
  adds the `/// <reference path=…>` lines to `.astro/types.d.ts` itself, so no
  `env.d.ts` edit is ever required. A manual override file can still shadow them.

## f — packaging

- `.astro` components inside `node_modules` are compiled normally when reached
  through the `exports` map (`astro-intl/components/IntlHead.astro`).
- Server-only JS exports work from the same package.
- The build emitted **zero** `.js`/`.mjs` client files and no hydration markers.
