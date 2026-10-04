/**
 * Compiles the user's `routing` config into the flat table the runtime reads.
 *
 * Everything that can be checked once — locale normalization, prefix modes,
 * static-path tables, template shapes — happens here, so the runtime contains
 * no validation, no schema and no parser.
 */
import {joinPath, normalizePathname, segmentKind, splitPath, withPrefix} from '../runtime/paths.js';
import type {DynamicRoute, Kind, RoutingTable} from '../runtime/table.js';
import type {LocaleMeta, LocalePrefix, Routing} from '../runtime/types.js';
import {IntlConfigError} from './errors.js';

export interface CompileOptions {
	/** normalized Astro `base`, `''` when there is none */
	base: string;
	/** per-locale metadata from the i18n integration options */
	locales?: Readonly<Record<string, LocaleMeta>>;
}

const PREFIXES: Record<LocalePrefix, 0 | 1 | 2> = {never: 0, always: 1, 'as-needed': 2};

export function compileRouting(routing: Routing, options: CompileOptions): RoutingTable {
	const errors: string[] = [];
	const raw = routing.locales;

	if (!Array.isArray(raw) || raw.length === 0) {
		throw new IntlConfigError(['`locales` must be a non-empty array, e.g. `["en", "fr"]`.']);
	}

	const locales: string[] = [];
	for (const locale of raw) {
		if (typeof locale !== 'string' || locale === '') {
			errors.push(`\`locales\` contains an entry that is not a non-empty string: ${JSON.stringify(locale)}.`);
			continue;
		}
		if (locales.includes(locale)) {
			// Reported, but compilation continues with the remaining locales so the
			// user sees every other problem in the same run.
			errors.push(`\`locales\` contains the duplicate locale "${locale}".`);
			continue;
		}
		locales.push(locale);
	}
	// Without a usable `locales` array nothing else can be checked meaningfully.
	if (locales.length === 0) throw new IntlConfigError(errors);

	const declared = locales.indexOf(routing.defaultLocale);
	if (declared === -1) {
		errors.push(`\`defaultLocale\` is "${routing.defaultLocale}" but \`locales\` is [${locales.join(', ')}].`);
	}
	const def = declared === -1 ? 0 : declared;

	const mode: LocalePrefix = routing.localePrefix ?? 'as-needed';
	const declaredPrefix = PREFIXES[mode];
	if (declaredPrefix === undefined) {
		errors.push(`\`localePrefix\` must be "always", "never" or "as-needed", received ${JSON.stringify(routing.localePrefix)}.`);
	}
	const prefix = declaredPrefix === undefined ? 2 : declaredPrefix;

	const prefixList: string[] = [];
	for (let i = 0; i < locales.length; i++) {
		prefixList.push(prefix === 0 || (prefix === 2 && i === def) ? '' : '/' + locales[i]);
	}

	const meta = options.locales ?? {};
	const langs = locales.map((locale) => meta[locale]?.lang ?? locale);

	const routes = new Map<string, [number, string]>();
	const localized: Map<string, string>[] = locales.map(() => new Map<string, string>());
	const dynamic: DynamicRoute[] = [];

	compilePathnames(routing, locales, prefix, prefixList, routes, localized, dynamic, errors);
	if (errors.length > 0) throw new IntlConfigError(errors);

	domainConflicts(prefixList, routes, errors);
	if (errors.length > 0) throw new IntlConfigError(errors);

	const cookie = routing.localeCookie;
	const cookieSpec =
		cookie === undefined
			? null
			: {
				name: cookie.name ?? 'ASTRO_INTL_LOCALE',
				maxAge: cookie.maxAge ?? 31_536_000,
				path: cookie.path ?? '/',
				sameSite: cookie.sameSite ?? 'lax',
				secure: cookie.secure ?? false
			};

	const detect = routing.localeDetection === false ? 0 : cookieSpec === null ? 2 : 3;

	const domains = compileDomains(routing, locales, def, prefix, errors);
	if (errors.length > 0) throw new IntlConfigError(errors);

	return {
		locales,
		keys: locales.map((locale) => locale.toLowerCase()),
		langs,
		def,
		prefix,
		base: options.base,
		detect,
		cookie: cookieSpec,
		domains,
		routes,
		localized,
		prefixes: prefixList,
		dynamic: dynamic.length === 0 ? null : sortDynamic(dynamic)
	};
}

function compilePathnames(
	routing: Routing,
	locales: readonly string[],
	prefix: 0 | 1 | 2,
	prefixList: readonly string[],
	routes: Map<string, [number, string]>,
	localized: Map<string, string>[],
	dynamic: DynamicRoute[],
	errors: string[]
): void {
	const pathnames = routing.pathnames;
	if (pathnames === undefined) return;

	for (const [key, value] of Object.entries(pathnames)) {
		if (!key.startsWith('/')) {
			errors.push(`\`pathnames\` key "${key}" must start with "/".`);
			continue;
		}
		const internal = normalizePathname(key, '');
		const mapping: Record<string, string> = {};
		for (let i = 0; i < locales.length; i++) {
			const locale = locales[i]!;
			mapping[locale] = externalFor(value, locale, internal);
		}

		const external: string[] = [];
		for (const locale of locales) {
			const candidate = mapping[locale]!;
			if (!candidate.startsWith('/')) {
				errors.push(`\`pathnames["${key}"]\` for locale "${locale}" must start with "/", received "${candidate}".`);
				continue;
			}
			external.push(normalizePathname(candidate, ''));
		}
		if (external.length !== locales.length) continue;

		const internalSegments = splitPath(internal);
		const kinds = internalSegments.map(segmentKind);
		for (let i = 0; i < kinds.length; i++) {
			if (kinds[i] === 2 && i !== kinds.length - 1) {
				errors.push(`\`pathnames["${key}"]\` has a catch-all segment before the end of the path.`);
			}
		}

		let isDynamic = false;
		for (const kind of kinds) {
			if (kind !== 0) isDynamic = true;
		}

		const perLocale: string[][] = [];
		for (const candidate of external) {
			const segments = splitPath(candidate);
			if (segments.length !== kinds.length) {
				errors.push(
					`\`pathnames["${key}"]\` maps to "${candidate}", which has ${segments.length} path segment(s) but "${key}" has ${kinds.length}. Localized paths must keep the same segment structure.`
				);
				continue;
			}
			for (let i = 0; i < kinds.length; i++) {
				if (segmentKind(segments[i]!) !== kinds[i]) {
					errors.push(
						`\`pathnames["${key}"]\` maps to "${candidate}", whose segment ${i + 1} ("${segments[i]}") does not match the template segment ("${internalSegments[i]}").`
					);
				}
			}
			perLocale.push(segments);
		}
		if (perLocale.length !== locales.length) continue;

		if (prefix === 0) {
			const first = joinPath(perLocale[0]!);
			for (let i = 1; i < perLocale.length; i++) {
				if (joinPath(perLocale[i]!) !== first) {
					errors.push(
						`\`pathnames["${key}"]\` differs per locale, which is not possible with \`localePrefix: "never"\`. Use "as-needed" or "always", or make the path identical for every locale.`
					);
					break;
				}
			}
		}

		for (let i = 0; i < locales.length; i++) {
			const externalPath = joinPath(perLocale[i]!);
			localized[i]!.set(internal, externalPath);
			// With `localePrefix: "never"` every locale maps a given URL to itself,
			// so the external -> internal map would only encode whichever locale was
			// compiled last. Those requests are resolved by detection instead.
			if (prefix === 0) continue;
			const full = withPrefix(prefixList[i]!, externalPath);
			const existing = routes.get(full);
			if (existing !== undefined && (existing[0] !== i || existing[1] !== internal)) {
				errors.push(
					`\`pathnames\` produces the URL "${full}" for both "${locales[existing[0]]!}: ${existing[1]}" and "${locales[i]}: ${internal}". External paths must be unique.`
				);
			}
			routes.set(full, [i, internal]);
		}

		if (isDynamic) dynamic.push({kinds: kinds as Kind[], internal: internalSegments, external: perLocale});
	}
}

function externalFor(value: string | Partial<Record<string, string>>, locale: string, fallback: string): string {
	if (typeof value === 'string') return value;
	// A locale that is absent from the entry keeps the internal path.
	return value[locale] ?? fallback;
}

function domainConflicts(
	prefixList: readonly string[],
	routes: ReadonlyMap<string, [number, string]>,
	errors: string[]
): void {
	const byLocale = new Map<string, string>();
	for (const [full, entry] of routes) {
		const prefix = prefixList[entry[0]]!;
		if (prefix === '') continue;
		const bare = full.slice(prefix.length) || '/';
		const other = byLocale.get(bare);
		if (other !== undefined && other !== entry[1]) {
			errors.push(
				`The external path "${bare}" is used by two different routes (${other} and ${entry[1]}). Localized paths must be unique after the locale prefix is removed.`
			);
		}
		byLocale.set(bare, entry[1]);
	}
}

function compileDomains(
	routing: Routing,
	locales: readonly string[],
	def: number,
	prefix: 0 | 1 | 2,
	errors: string[]
): RoutingTable['domains'] {
	const domains = routing.domains;
	if (domains === undefined) return null;
	const out: NonNullable<RoutingTable['domains']> = [];
	for (const entry of domains) {
		if (typeof entry.domain !== 'string' || entry.domain === '') {
			errors.push('Every entry in `domains` needs a non-empty `domain`.');
			continue;
		}
		const domainDefault = entry.defaultLocale === undefined ? def : locales.indexOf(entry.defaultLocale);
		if (domainDefault === -1) {
			errors.push(`\`domains["${entry.domain}"].defaultLocale\` is "${entry.defaultLocale}", which is not in \`locales\`.`);
			continue;
		}
		const prefixes: (string | null)[] = locales.map((locale, i) => {
			const configured = entry.locales?.[locale];
			if (configured !== undefined) return normalizePathname(configured, '');
			if (i === domainDefault) return '';
			return prefix === 0 ? '' : '/' + locale;
		});
		out.push({domain: entry.domain, default: domainDefault, prefixes});
	}
	return out.length === 0 ? null : out;
}

/**
 * Orders templates so the first match is the same one Astro's own router would
 * pick for the internal path. Otherwise an external URL could map to a route
 * that Astro then refuses to render.
 *
 * This mirrors `routeComparator` in `astro/dist/core/routing/priority.js`:
 * static segments first, then non-spread dynamic, then spread, and finally
 * longer routes before shorter ones.
 */
function sortDynamic(routes: DynamicRoute[]): DynamicRoute[] {
	return routes
		.map((route, index) => ({route, index}))
		.sort((a, b) => compare(a.route.kinds, b.route.kinds) || a.index - b.index)
		.map((entry) => entry.route);
}

/** Negative when `a` is the more specific template. */
function compare(a: readonly Kind[], b: readonly Kind[]): number {
	const common = Math.min(a.length, b.length);
	for (let i = 0; i < common; i++) {
		const x = a[i]!;
		const y = b[i]!;
		if (x !== y) {
			// 0 (literal) < 1 ([param]) < 2 ([...rest])
			return x - y;
		}
	}
	if (a.length !== b.length) {
		const aRest = a[a.length - 1] === 2;
		const bRest = b[b.length - 1] === 2;
		// A route ending in `[...rest]` may absorb a segment the shorter route
		// needs for a parameter, so it defers unless nothing else differs.
		if (aRest !== bRest && Math.abs(a.length - b.length) === 1) {
			return a.length > b.length ? 1 : -1;
		}
		return a.length > b.length ? -1 : 1;
	}
	return 0;
}
