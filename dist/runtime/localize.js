/**
 * Turns an external request into the internal request Astro should render.
 *
 * Astro matches a route against the request URL *before* middleware runs, so a
 * localized URL cannot be served by rewriting from middleware: it has to be
 * rewritten before the state is created. This module is that one step, and it is
 * pure — no Astro, no filesystem, no allocation unless the URL actually differs.
 */
import { carryLocale, carriedLocale } from './internal.js';
import { normalizePathname } from './paths.js';
import { pathnameOf, resolveRequest } from './resolve.js';
/**
 * Returns the request Astro should route.
 *
 * When the external path is already the internal one the very same object comes
 * back, with the resolved locale attached — which is all the middleware needs.
 */
export function localizeRequest(request, table) {
    const carried = carriedLocale(request);
    if (carried !== undefined)
        return request;
    const resolved = resolveRequest(request, table);
    if (resolved.pathname === normalizePathname(pathnameOf(request.url), table.base)) {
        return carryLocale(request, resolved.locale);
    }
    const url = new URL(request.url);
    url.pathname = table.base + resolved.pathname;
    return carryLocale(new Request(url, request), resolved.locale);
}
//# sourceMappingURL=localize.js.map