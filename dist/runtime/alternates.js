/**
 * Alternate URLs for `<head>`. Built lazily so pages that do not render
 * `IntlHead` pay nothing.
 */
import { getPathname } from './get-pathname.js';
/**
 * One entry per locale, in configuration order, pointing at the same internal
 * page. Callers emit the default locale twice: once as its own `hreflang` and
 * once as `x-default`.
 */
export function alternates(table, pathname) {
    const locales = table.locales;
    const out = [];
    for (let i = 0; i < locales.length; i++) {
        out.push({ locale: locales[i], href: getPathname(table, i, pathname) });
    }
    return out;
}
/** `Content-Language` for a locale, precomputed at build time. */
export function contentLanguage(table, localeIndex) {
    return table.locales[localeIndex];
}
//# sourceMappingURL=alternates.js.map