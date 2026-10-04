/**
 * The request engine: pure, Astro-free, and shared by every surface
 * (injected middleware, `astro-intl/fetch`, `astro-intl/hono`).
 */
import { readCookie } from './cookie.js';
import { carriedLocale } from './internal.js';
import { negotiate } from './negotiate.js';
import { buildInternal, matchDynamic, normalizePathname, splitPath } from './paths.js';
/**
 * Extracts the pathname from a request URL without constructing a `URL`.
 * A request URL is always `scheme://host/path?query#hash` (or `host/path`).
 */
export function pathnameOf(url) {
    const scheme = url.indexOf('://');
    const start = url.indexOf('/', scheme === -1 ? 0 : scheme + 3);
    if (start === -1)
        return '/';
    let end = url.length;
    const hash = url.indexOf('#', start);
    if (hash !== -1)
        end = hash;
    const query = url.indexOf('?', start);
    if (query !== -1 && query < end)
        end = query;
    return url.slice(start, end);
}
/**
 * Maps a request onto an internal route pathname and a locale.
 *
 * Localized static paths are a single `Map` lookup. Dynamic templates are only
 * consulted when no static path matched, and the request headers are only read
 * when neither matched — so the common case allocates nothing.
 */
export function resolveRequest(request, table) {
    const pathname = normalizePathname(pathnameOf(request.url), table.base);
    // A request this package already resolved (the fetch entry, the prerenderer)
    // carries its locale, and its pathname is already the internal one.
    const carried = carriedLocale(request);
    if (carried !== undefined)
        return { locale: carried, pathname };
    const hit = table.routes.get(pathname);
    if (hit !== undefined)
        return { locale: table.locales[hit[0]], pathname: hit[1] };
    let index = table.def;
    let rest = pathname;
    let explicit = false;
    if (table.prefix !== 0) {
        index = splitLocalePrefix(pathname, table.prefixes);
        if (index !== -1) {
            explicit = true;
            rest = pathname.slice(table.prefixes[index].length) || '/';
        }
        else {
            index = table.def;
        }
    }
    const dynamic = table.dynamic;
    if (dynamic !== null) {
        const segments = splitPath(rest);
        for (let i = 0; i < dynamic.length; i++) {
            const params = matchDynamic(dynamic[i], segments, index);
            if (params !== null) {
                return { locale: table.locales[index], pathname: buildInternal(dynamic[i], params) };
            }
        }
    }
    // A locale prefix in the path always wins over cookies and `Accept-Language`.
    const detected = explicit ? index : detect(pathname, request, table);
    return {
        locale: table.locales[detected],
        pathname: stripPrefix(pathname, table.prefixes[detected]),
    };
}
/** The index of the locale whose prefix this pathname carries, or `-1`. */
export function splitLocalePrefix(pathname, prefixes) {
    for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        if (prefix !== '' && hasPrefix(pathname, prefix))
            return i;
    }
    return -1;
}
/** `true` when `pathname` is `prefix` itself or a path below it. */
export function hasPrefix(pathname, prefix) {
    const end = prefix.length;
    if (pathname.length < end)
        return false;
    if (!pathname.startsWith(prefix))
        return false;
    return pathname.length === end || pathname.charCodeAt(end) === 47;
}
/**
 * Domain, then cookie, then `Accept-Language`, then the default locale.
 * Only reached when the pathname carried no locale information.
 */
export function detect(pathname, request, table) {
    const domains = table.domains;
    if (domains !== null) {
        const headers = readableHeaders(request);
        const host = hostname(headers?.get('host') ?? null);
        if (host !== '') {
            for (let i = 0; i < domains.length; i++) {
                const domain = domains[i];
                if (domain.domain !== host)
                    continue;
                const prefixes = domain.prefixes;
                for (let l = 0; l < prefixes.length; l++) {
                    const prefix = prefixes[l];
                    // The domain default locale carries the empty prefix, which would
                    // match everything, so it is only used as the fallback below.
                    if (prefix == null || prefix === '')
                        continue;
                    if (hasPrefix(pathname, prefix))
                        return l;
                }
                return domain.default;
            }
        }
    }
    const bits = table.detect;
    if (bits !== 0) {
        const headers = readableHeaders(request);
        if (headers !== null) {
            if ((bits & 1) !== 0 && table.cookie !== null) {
                const header = headers.get('cookie');
                if (header !== null) {
                    const value = readCookie(header, table.cookie.name);
                    if (value !== undefined) {
                        const index = table.locales.indexOf(value);
                        if (index !== -1)
                            return index;
                    }
                }
            }
            if ((bits & 2) !== 0) {
                const header = headers.get('accept-language');
                if (header !== null) {
                    const index = negotiate(header, table);
                    if (index !== -1)
                        return index;
                }
            }
        }
    }
    return table.def;
}
/**
 * The request headers, or `null` when there are none to read.
 *
 * While prerendering, Astro replaces `request.headers` with an accessor that
 * warns on every read, because a prerendered request genuinely has no headers.
 * Cookie and `Accept-Language` detection cannot work there either, so the
 * accessor is detected instead of read: the locale of a prerendered page comes
 * from its URL, which the build already expanded to a localized one.
 */
function readableHeaders(request) {
    const descriptor = Object.getOwnPropertyDescriptor(request, 'headers');
    return descriptor !== undefined && descriptor.get !== undefined ? null : request.headers;
}
function stripPrefix(pathname, prefix) {
    if (prefix === '' || !pathname.startsWith(prefix))
        return pathname;
    const rest = pathname.slice(prefix.length);
    return rest === '' ? '/' : rest;
}
function hostname(host) {
    if (host === null)
        return '';
    const colon = host.lastIndexOf(':');
    return colon === -1 ? host : host.slice(0, colon);
}
//# sourceMappingURL=resolve.js.map