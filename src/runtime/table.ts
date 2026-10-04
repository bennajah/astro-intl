/** Compiled, build-time-validated routing table. Types only — erased at compile time. */

export type Kind = 0 | 1 | 2;

/** One `[param]` or `[...rest]` route template, shared across locales. */
export interface DynamicRoute {
	/** segment kinds, one per path segment */
	kinds: Kind[];
	/** internal template segments, e.g. `['blog', '[slug]']` */
	internal: string[];
	/** external template segments per locale, e.g. `[['articles', '[slug]']]` */
	external: string[][];
}

/** Cookie description, pre-split so the runtime never parses anything. */
export interface CookieSpec {
	name: string;
	maxAge: number;
	path: string;
	sameSite: 'lax' | 'strict' | 'none';
	secure: boolean;
}

/** One domain from `routing.domains`, flattened for the runtime. */
export interface DomainSpec {
	domain: string;
	default: number;
	/** locale index -> external path prefix, or `null` when the locale is not served on this domain */
	prefixes: (string | null)[];
}

export interface RoutingTable {
	/** locale tags, in configuration order */
	locales: string[];
	/** lowercase copies of `locales`, so negotiation never lowercases at runtime */
	keys: string[];
	/** per locale, the tag advertised in `Content-Language` (falls back to the locale) */
	langs: string[];
	/** index of `defaultLocale` in `locales` */
	def: number;
	/** localePrefix: 0 = never, 1 = always, 2 = as-needed */
	prefix: 0 | 1 | 2;
	/** normalized `base`, `''` when there is none */
	base: string;
	/** bitmask: 1 = locale cookie, 2 = Accept-Language */
	detect: number;
	cookie: CookieSpec | null;
	domains: DomainSpec[] | null;
	/** external path (including any locale prefix) -> `[localeIndex, internalPath]` */
	routes: Map<string, [number, string]>;
	/** per locale, internal path -> external path (including any locale prefix) */
	localized: Map<string, string>[];
	/** per locale, external path prefix, `''` when the locale is not prefixed */
	prefixes: string[];
	/** dynamic templates, ordered most specific first */
	dynamic: DynamicRoute[] | null;
}

/** What `resolveRequest` reports back to the caller. */
export interface ResolvedRequest {
	/** the negotiated locale tag */
	locale: string;
	/** internal route pathname, never carries a locale prefix */
	pathname: string;
}
