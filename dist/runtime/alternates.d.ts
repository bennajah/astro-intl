import type { RoutingTable } from './table.js';
export interface Alternate {
    locale: string;
    href: string;
}
/**
 * One entry per locale, in configuration order, pointing at the same internal
 * page. Callers emit the default locale twice: once as its own `hreflang` and
 * once as `x-default`.
 */
export declare function alternates(table: RoutingTable, pathname: string): Alternate[];
/** `Content-Language` for a locale, precomputed at build time. */
export declare function contentLanguage(table: RoutingTable, localeIndex: number): string;
//# sourceMappingURL=alternates.d.ts.map