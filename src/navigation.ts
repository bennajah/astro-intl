/**
 * `astro-intl/navigation` — the project's navigation helpers, already bound to
 * the routing configuration from `astro.config`.
 *
 * Use `createNavigation(routing)` instead when you want to build the helpers
 * from an explicit routing object, e.g. in tests.
 */
import table from 'virtual:astro-intl/config';
import {createNavigation, type Navigation} from './runtime/navigation.js';

export type {Alternate, Navigation, PathnameParams} from './runtime/navigation.js';
export {createNavigation} from './runtime/navigation.js';

const navigation: Navigation = createNavigation(table);

/**
 * Builds the external URL for an internal pathname.
 *
 * ```ts
 * getPathname('fr', '/about')
 * getPathname('fr', '/blog/[slug]', {slug: 'hi'})
 * ```
 */
export const getPathname: Navigation['getPathname'] = (locale, pathname, params) =>
	navigation.getPathname(locale, pathname, params);

/** `[{locale, href}, …]` for every locale, pointing at the same page. */
export const getAlternates: Navigation['alternates'] = (pathname) => navigation.alternates(pathname);

/** The configured locales, in configuration order. */
export const locales: readonly string[] = navigation.locales;

/** The default locale tag. */
export const defaultLocale: string = navigation.defaultLocale;

export default navigation;