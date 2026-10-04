/**
 * The one piece of state that has to survive a rewrite.
 *
 * When an external URL is localized, the request Astro finally sees has the
 * *internal* pathname — so resolving it again would find the default locale and
 * lose the visitor's choice. The resolved locale therefore rides along on the
 * request object itself.
 *
 * A registered `Symbol` is used rather than a header on purpose: a header could
 * be forged by a client, a symbol cannot.
 */
const RESOLVED = Symbol.for('astro-intl.resolved');

/** The locale carried by `request`, or `undefined` when it was not resolved. */
export function carriedLocale(request: Request): string | undefined {
	return Reflect.get(request, RESOLVED);
}

/** Tags `request` with the locale it was resolved to. */
export function carryLocale(request: Request, locale: string): Request {
	Reflect.set(request, RESOLVED, locale);
	return request;
}