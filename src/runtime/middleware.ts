/**
 * The one place where a request becomes a locale.
 *
 * Every surface (the injected middleware, `astro-intl/fetch`,
 * `astro-intl/hono`) funnels into `resolveRequest`, so they cannot disagree
 * about routing. Nothing here imports Astro, which keeps the module usable from
 * any surface and cheap to bundle.
 */
import {resolveRequest} from './resolve.js';
import {runWithStore, type RequestStore} from './store.js';
import type {RoutingTable} from './table.js';

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
export function localize(context: MiddlewareContext, table: RoutingTable): RequestLocale {
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
export function createMiddleware(table: RoutingTable): Middleware {
	return (context, next) => {
		const {locale, pathname} = localize(context, table);
		const store: RequestStore = {locale, pathname};
		return runWithStore(store, () => next());
	};
}