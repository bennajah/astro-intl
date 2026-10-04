export type { AstroFetchState } from 'astro/fetch';
/**
 * Resolves the locale and returns the request Astro should route.
 *
 * The returned request is the one that came in whenever the URL needs no
 * translation, so the common case allocates nothing.
 */
export declare function localizeRequest(request: Request): Request;
//# sourceMappingURL=fetch.d.ts.map