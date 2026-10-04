/** Locale prefix strategy for external URLs. */
export type LocalePrefix = 'always' | 'never' | 'as-needed';

/** Where the locale may be encoded in an external path. */
export type Pathname = string;

/**
 * An internal route template, optionally mapped to one external template per
 * locale. A plain string is shorthand for "the same path in every locale".
 */
export type Pathnames = Record<Pathname, Pathname | Partial<Record<string, Pathname>>>;

/** Marks a value as a string literal union instead of `string`. */
export type LiteralUnion<L extends string> = L | (string & Record<never, never>);

/** Cookie written when a visitor picks a locale explicitly. */
export interface LocaleCookieConfig {
	name?: string;
	maxAge?: number;
	sameSite?: 'lax' | 'strict' | 'none';
	secure?: boolean;
	path?: string;
}

export interface DomainConfig {
	domain: string;
	defaultLocale?: string;
	locales?: Partial<Record<string, Pathname>>;
}

/** The routing configuration, as written by the user. */
export interface Routing<L extends string = string> {
	locales: readonly L[];
	defaultLocale: L;
	localePrefix?: LocalePrefix;
	localeDetection?: boolean;
	localeCookie?: LocaleCookieConfig;
	domains?: readonly DomainConfig[];
	pathnames?: Pathnames;
}

/** Per-locale display metadata. */
export interface LocaleMeta {
	label?: string;
	lang?: string;
	direction?: 'ltr' | 'rtl';
	timeZone?: string;
}

/** The user-facing messages API shape produced by `getTranslations`. */
export interface Messages {
	[id: string]: string | Messages;
}
