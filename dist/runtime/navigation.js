/**
 * Locale-aware URL building, bound to one routing table.
 *
 * Every helper is a closure over the compiled table, so a call performs no
 * configuration lookup and no parsing.
 */
import { alternates } from './alternates.js';
import { getPathname } from './get-pathname.js';
export function createNavigation(table) {
    const indexOf = (locale) => {
        const index = table.locales.indexOf(locale);
        if (index === -1) {
            throw new Error(`astro-intl: "${locale}" is not one of the configured locales [${table.locales.join(', ')}].`);
        }
        return index;
    };
    return {
        getPathname(locale, pathname, params) {
            return table.base + getPathname(table, indexOf(locale), pathname, params);
        },
        alternates(pathname) {
            return alternates(table, pathname);
        },
        localeIndex: indexOf,
        locales: table.locales,
        defaultLocale: table.locales[table.def]
    };
}
//# sourceMappingURL=navigation.js.map