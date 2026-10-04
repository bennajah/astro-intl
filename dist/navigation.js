/**
 * `astro-intl/navigation` — the project's navigation helpers, already bound to
 * the routing configuration from `astro.config`.
 *
 * Use `createNavigation(routing)` instead when you want to build the helpers
 * from an explicit routing object, e.g. in tests.
 */
import table from 'virtual:astro-intl/config';
import { createNavigation } from './runtime/navigation.js';
export { createNavigation } from './runtime/navigation.js';
const navigation = createNavigation(table);
/**
 * Builds the external URL for an internal pathname.
 *
 * ```ts
 * getPathname('fr', '/about')
 * getPathname('fr', '/blog/[slug]', {slug: 'hi'})
 * ```
 */
export const getPathname = (locale, pathname, params) => navigation.getPathname(locale, pathname, params);
/** `[{locale, href}, …]` for every locale, pointing at the same page. */
export const getAlternates = (pathname) => navigation.alternates(pathname);
/** The configured locales, in configuration order. */
export const locales = navigation.locales;
/** The default locale tag. */
export const defaultLocale = navigation.defaultLocale;
export default navigation;
//# sourceMappingURL=navigation.js.map