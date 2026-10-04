/**
 * `astro-intl` — the public types plus the one helper that needs no routing
 * argument. Import submodules (`astro-intl/routing`, `astro-intl/server`, …)
 * directly; there is no barrel to pull in.
 */
import {table} from './runtime/instance.js';

export type {
	DomainConfig,
	LocaleCookieConfig,
	LocaleMeta,
	LocalePrefix,
	Messages,
	Pathname,
	Pathnames,
	Routing
} from './runtime/types.js';

/**
 * A locale tag of the configured `locales` array. Narrowed to a literal union by
 * the generated types in `.astro/integrations/astro-intl/astro-intl.d.ts`.
 */
export type Locale = string;

/** Narrows an arbitrary value to a configured locale. */
export function hasLocale(value: unknown): value is Locale {
	const locales = table().locales;
	return typeof value === 'string' && locales.indexOf(value) !== -1;
}
