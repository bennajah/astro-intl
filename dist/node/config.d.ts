import type { LocaleMeta, Routing } from '../runtime/types.js';
export interface IntlOptions {
    /** The routing configuration, usually produced by `defineRouting`. */
    routing: Routing;
    /** Default directory for message files, relative to the project root. */
    defaultMessages?: string;
    /** Per-locale display metadata used by `IntlHead` and the language switcher. */
    locales?: Record<string, LocaleMeta>;
    /**
     * Where the request-scoped locale is stored.
     *
     * `'als'` (the default) reads the current request's locale with no argument,
     * which needs `AsyncLocalStorage`. `'explicit'` makes every API require a
     * context, which works on runtimes without it.
     */
    context?: 'als' | 'explicit';
}
export declare const CONFIG_MODULE = "virtual:astro-intl/config";
/** Normalizes Astro's `base`, which is always at least `'/'`. */
export declare function normalizeBase(base: string | undefined): string;
/**
 * Validates the options and returns the source of the generated config module.
 * Throws one aggregated `IntlConfigError` if anything is wrong.
 */
export declare function buildConfigModule(options: IntlOptions, base: string | undefined): string;
//# sourceMappingURL=config.d.ts.map