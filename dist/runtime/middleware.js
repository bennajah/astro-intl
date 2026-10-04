/**
 * The one place where a request becomes a locale.
 *
 * Every surface (the injected middleware, `astro-intl/fetch`,
 * `astro-intl/hono`) funnels into `resolveRequest`, so they cannot disagree
 * about routing. Nothing here imports Astro, which keeps the module usable from
 * any surface and cheap to bundle.
 */
import { resolveRequest } from './resolve.js';
import { runWithStore } from './store.js';
/**
 * Resolves a request and publishes the locale on `locals`.
 *
 * The pathname published is internal, so pages can be written against
 * unlocalized paths and never have to strip a prefix themselves.
 */
export function localize(context, table) {
    const resolved = resolveRequest(context.request, table);
    context.locals['locale'] = resolved.locale;
    context.locals['pathname'] = resolved.pathname;
    return resolved;
}
/**
 * Builds the middleware. The integration injects it automatically; it is
 * exported so a project that manages its own middleware chain can install it
 * explicitly from `astro-intl/middleware`.
 */
export function createMiddleware(table) {
    return (context, next) => {
        const { locale, pathname } = localize(context, table);
        const store = { locale, pathname };
        return runWithStore(store, () => next());
    };
}
//# sourceMappingURL=middleware.js.map