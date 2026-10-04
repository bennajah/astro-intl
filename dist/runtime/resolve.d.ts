import type { ResolvedRequest, RoutingTable } from './table.js';
/**
 * Extracts the pathname from a request URL without constructing a `URL`.
 * A request URL is always `scheme://host/path?query#hash` (or `host/path`).
 */
export declare function pathnameOf(url: string): string;
/**
 * Maps a request onto an internal route pathname and a locale.
 *
 * Localized static paths are a single `Map` lookup. Dynamic templates are only
 * consulted when no static path matched, and the request headers are only read
 * when neither matched — so the common case allocates nothing.
 */
export declare function resolveRequest(request: Request, table: RoutingTable): ResolvedRequest;
/** The index of the locale whose prefix this pathname carries, or `-1`. */
export declare function splitLocalePrefix(pathname: string, prefixes: readonly string[]): number;
/** `true` when `pathname` is `prefix` itself or a path below it. */
export declare function hasPrefix(pathname: string, prefix: string): boolean;
/**
 * Domain, then cookie, then `Accept-Language`, then the default locale.
 * Only reached when the pathname carried no locale information.
 */
export declare function detect(pathname: string, request: Request, table: RoutingTable): number;
//# sourceMappingURL=resolve.d.ts.map