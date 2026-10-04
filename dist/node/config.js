/**
 * Reads the i18n options out of `astro.config` and validates them.
 *
 * Every problem found is collected and reported in a single `IntlConfigError`,
 * so a user never has to rebuild once per mistake.
 */
import { compileRouting } from './compile.js';
import { IntlConfigError } from './errors.js';
import { serializeRouting } from './serialize.js';
export const CONFIG_MODULE = 'virtual:astro-intl/config';
/** Normalizes Astro's `base`, which is always at least `'/'`. */
export function normalizeBase(base) {
    if (base === undefined || base === '/' || base === '')
        return '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
}
/**
 * Validates the options and returns the source of the generated config module.
 * Throws one aggregated `IntlConfigError` if anything is wrong.
 */
export function buildConfigModule(options, base) {
    if (options === null || typeof options !== 'object') {
        throw new IntlConfigError(['The `astro-intl` integration needs a `routing` option.']);
    }
    if (options.routing === undefined) {
        throw new IntlConfigError([
            '`routing` is required, e.g. `astroIntl({routing: defineRouting({locales: ["en"], defaultLocale: "en"})})`.'
        ]);
    }
    if (options.context !== undefined && options.context !== 'als' && options.context !== 'explicit') {
        throw new IntlConfigError([`\`context\` must be "als" or "explicit", received ${JSON.stringify(options.context)}.`]);
    }
    const table = compileRouting(options.routing, {
        base: normalizeBase(base),
        ...(options.locales === undefined ? {} : { locales: options.locales })
    });
    return serializeRouting(table);
}
//# sourceMappingURL=config.js.map