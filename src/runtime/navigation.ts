/**
 * Locale-aware URL building, bound to one routing table.
 *
 * Every helper is a closure over the compiled table, so a call performs no
 * configuration lookup and no parsing.
 */
import {alternates, type Alternate} from './alternates.js';
import {getPathname, type PathnameParams} from './get-pathname.js';
import type {RoutingTable} from './table.js';

export type {PathnameParams} from './get-pathname.js';
export type {Alternate} from './alternates.js';

export interface Navigation {
	/**
	 * Builds the external URL, including `base`, for an internal pathname.
	 *
	 * ```ts
	 * getPathname('fr', '/about')
	 * getPathname('fr', '/blog/[slug]', {slug: 'hi'})
	 * ```
	 */
	getPathname(locale: string, pathname: string, params?: PathnameParams): string;
	/** `[{locale, href}, …]` for every locale, pointing at the same page. */
	alternates(pathname: string): Alternate[];
	/** The index of a locale, or `-1`. */
	localeIndex(locale: string): number;
	/** The configured locales, in configuration order. */
	locales: string[];
	/** The default locale tag. */
	defaultLocale: string;
}

export function createNavigation(table: RoutingTable): Navigation {
	const indexOf = (locale: string): number => {
		const index = table.locales.indexOf(locale);
		if (index === -1) {
			throw new Error(`astro-intl: "${locale}" is not one of the configured locales [${table.locales.join(', ')}].`);
		}
		return index;
	};

	return {
		getPathname(locale, pathname, params) {
			return table.base + getPathname(table, indexOf(locale), pathname, params);
		},
		alternates(pathname) {
			return alternates(table, pathname);
		},
		localeIndex: indexOf,
		locales: table.locales,
		defaultLocale: table.locales[table.def]!
	};
}