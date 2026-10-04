/**
 * Alternate URLs for `<head>`. Built lazily so pages that do not render
 * `IntlHead` pay nothing.
 */
import {getPathname} from './get-pathname.js';
import type {RoutingTable} from './table.js';

export interface Alternate {
	locale: string;
	href: string;
}

/**
 * One entry per locale, in configuration order, pointing at the same internal
 * page. Callers emit the default locale twice: once as its own `hreflang` and
 * once as `x-default`.
 */
export function alternates(table: RoutingTable, pathname: string): Alternate[] {
	const locales = table.locales;
	const out: Alternate[] = [];
	for (let i = 0; i < locales.length; i++) {
		out.push({locale: locales[i]!, href: getPathname(table, i, pathname)});
	}
	return out;
}

/** `Content-Language` for a locale, precomputed at build time. */
export function contentLanguage(table: RoutingTable, localeIndex: number): string {
	return table.locales[localeIndex]!;
}
