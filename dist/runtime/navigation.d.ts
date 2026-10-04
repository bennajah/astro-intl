/**
 * Locale-aware URL building, bound to one routing table.
 *
 * Every helper is a closure over the compiled table, so a call performs no
 * configuration lookup and no parsing.
 */
import { type Alternate } from './alternates.js';
import { type PathnameParams } from './get-pathname.js';
import type { RoutingTable } from './table.js';
export type { PathnameParams } from './get-pathname.js';
export type { Alternate } from './alternates.js';
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
export declare function createNavigation(table: RoutingTable): Navigation;
//# sourceMappingURL=navigation.d.ts.map