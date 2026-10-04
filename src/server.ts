/**
 * Server-side utilities bound to the routing configuration.
 *
 * All of these read the active table from `virtual:astro-intl/config`, which the
 * integration and the middleware already loaded.
 */
import table from 'virtual:astro-intl/config';
import {carriedLocale} from './runtime/internal.js';
import {normalizePathname} from './runtime/paths.js';
import {pathnameOf, resolveRequest} from './runtime/resolve.js';
import type {ResolvedRequest} from './runtime/table.js';

export type {ResolvedRequest} from './runtime/table.js';

/** The locale that has been resolved for this request, or `undefined`. */
export function getRequestLocale(request: Request): string | undefined {
	const carried = carriedLocale(request);
	if (carried !== undefined) return carried;
	const resolved = resolveRequest(request, table);
	return resolved.locale;
}

/**
 * Returns the internal pathname and locale for the request.
 *
 * This is the pure engine: `pathname` is always the internal route path,
 * regardless of what the external URL looked like.
 */
export function resolveRequestLocale(request: Request): ResolvedRequest {
	const carried = carriedLocale(request);
	if (carried !== undefined) {
		const path = normalizePathname(pathnameOf(request.url), table.base);
		return {locale: carried, pathname: path};
	}
	return resolveRequest(request, table);
}