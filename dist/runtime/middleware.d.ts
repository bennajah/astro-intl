import type { RoutingTable } from './table.js';
/** What the middleware publishes for the rest of the request to read. */
export interface RequestLocale {
    locale: string;
    /** The **internal** pathname, matching what Astro's router expects. */
    pathname: string;
}
/** The subset of Astro's middleware context that this package uses. */
export interface MiddlewareContext {
    request: Request;
    url: URL;
    locals: Record<string, unknown>;
}
export type MiddlewareNext = () => Promise<unknown>;
export type Middleware = (context: MiddlewareContext, next: MiddlewareNext) => Promise<unknown>;
/**
 * Resolves a request and publishes the locale on `locals`.
 *
 * The pathname published is internal, so pages can be written against
 * unlocalized paths and never have to strip a prefix themselves.
 */
export declare function localize(context: MiddlewareContext, table: RoutingTable): RequestLocale;
/**
 * Builds the middleware. The integration injects it automatically; it is
 * exported so a project that manages its own middleware chain can install it
 * explicitly from `astro-intl/middleware`.
 */
export declare function createMiddleware(table: RoutingTable): Middleware;
//# sourceMappingURL=middleware.d.ts.map