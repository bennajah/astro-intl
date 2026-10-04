/**
 * `astro-intl/hono` — localization for projects that run Astro inside Hono.
 *
 * ```ts
 * import {Hono} from 'hono';
 * import {astro, pages} from 'astro/hono';
 * import {i18n} from 'astro-intl/hono';
 *
 * const app = new Hono();
 * app.use(i18n());
 * app.use(pages());
 * ```
 *
 * Register it before Astro's own handlers. A localized URL cannot be routed by
 * Astro as it comes in, so `i18n()` renders those requests itself and returns
 * the response; every other request is handed to the rest of the chain.
 */
import {FetchState, astro} from 'astro/fetch';
import {localizeRequest} from './fetch.js';

/** The part of Hono's context this middleware uses. No Hono dependency. */
export interface HonoContextLike {
	req: {raw: Request};
}

export type HonoMiddlewareHandler = (context: HonoContextLike, next: () => Promise<void>) => Promise<Response | void>;

/**
 * Resolves the locale before Astro sees the request.
 *
 * Returns the Hono middleware; it is a factory so the comparison below does not
 * run per request.
 */
export function i18n(): HonoMiddlewareHandler {
	return (context, next) => {
		const request = context.req.raw;
		const localized = localizeRequest(request);
		// The URL needed no translation: the request object was tagged in place
		// and the rest of the chain can handle it.
		if (localized === request) return next();
		return astro(new FetchState(localized));
	};
}