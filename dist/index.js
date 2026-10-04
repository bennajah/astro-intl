/**
 * `astro-intl` — the public types plus the one helper that needs no routing
 * argument. Import submodules (`astro-intl/routing`, `astro-intl/server`, …)
 * directly; there is no barrel to pull in.
 */
import { table } from './runtime/instance.js';
/** Narrows an arbitrary value to a configured locale. */
export function hasLocale(value) {
    const locales = table().locales;
    return typeof value === 'string' && locales.indexOf(value) !== -1;
}
//# sourceMappingURL=index.js.map