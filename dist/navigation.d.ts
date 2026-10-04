import { type Navigation } from './runtime/navigation.js';
export type { Alternate, Navigation, PathnameParams } from './runtime/navigation.js';
export { createNavigation } from './runtime/navigation.js';
declare const navigation: Navigation;
/**
 * Builds the external URL for an internal pathname.
 *
 * ```ts
 * getPathname('fr', '/about')
 * getPathname('fr', '/blog/[slug]', {slug: 'hi'})
 * ```
 */
export declare const getPathname: Navigation['getPathname'];
/** `[{locale, href}, …]` for every locale, pointing at the same page. */
export declare const getAlternates: Navigation['alternates'];
/** The configured locales, in configuration order. */
export declare const locales: readonly string[];
/** The default locale tag. */
export declare const defaultLocale: string;
export default navigation;
//# sourceMappingURL=navigation.d.ts.map