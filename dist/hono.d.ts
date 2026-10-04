/** The part of Hono's context this middleware uses. No Hono dependency. */
export interface HonoContextLike {
    req: {
        raw: Request;
    };
}
export type HonoMiddlewareHandler = (context: HonoContextLike, next: () => Promise<void>) => Promise<Response | void>;
/**
 * Resolves the locale before Astro sees the request.
 *
 * Returns the Hono middleware; it is a factory so the comparison below does not
 * run per request.
 */
export declare function i18n(): HonoMiddlewareHandler;
//# sourceMappingURL=hono.d.ts.map