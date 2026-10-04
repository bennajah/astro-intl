export type { DomainConfig, LocaleCookieConfig, LocaleMeta, LocalePrefix, Messages, Pathname, Pathnames, Routing } from './runtime/types.js';
/**
 * A locale tag of the configured `locales` array. Narrowed to a literal union by
 * the generated types in `.astro/integrations/astro-intl/astro-intl.d.ts`.
 */
export type Locale = string;
/** Narrows an arbitrary value to a configured locale. */
export declare function hasLocale(value: unknown): value is Locale;
//# sourceMappingURL=index.d.ts.map