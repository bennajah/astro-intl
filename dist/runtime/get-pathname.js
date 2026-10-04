/**
 * Internal pathname -> external pathname.
 *
 * Shared by `createNavigation().getPathname`, the prerenderer and `IntlHead`,
 * so all three produce byte-identical URLs.
 */
import { applyParams, joinTemplate, matchTemplate, splitPath, withPrefix } from './paths.js';
export function getPathname(table, localeIndex, pathname, params) {
    const prefix = table.prefixes[localeIndex];
    if (params === undefined)
        return lookup(table, localeIndex, pathname, prefix);
    const values = orderParams(pathname, params);
    const dynamic = table.dynamic;
    if (dynamic !== null) {
        for (let i = 0; i < dynamic.length; i++) {
            const route = dynamic[i];
            if (joinTemplate(route.internal) === pathname) {
                return withPrefix(prefix, applyParams(joinTemplate(route.external[localeIndex]), values));
            }
        }
    }
    return withPrefix(prefix, applyParams(pathname, values));
}
function lookup(table, localeIndex, pathname, prefix) {
    // An already-localized URL is returned unchanged, so passing the output of a
    // previous call back in never grows a second prefix.
    const known = table.routes.get(pathname);
    if (known !== undefined && known[0] === localeIndex)
        return pathname;
    const hit = table.localized[localeIndex].get(pathname);
    if (hit !== undefined)
        return withPrefix(prefix, hit);
    const dynamic = table.dynamic;
    if (dynamic !== null) {
        const segments = splitPath(pathname);
        for (let i = 0; i < dynamic.length; i++) {
            const route = dynamic[i];
            const params = matchTemplate(route.internal, segments);
            if (params !== null)
                return withPrefix(prefix, applyParams(joinTemplate(route.external[localeIndex]), params));
        }
    }
    return withPrefix(prefix, pathname);
}
/** Turns `{slug: 'a'}` into values ordered by the placeholders in the template. */
function orderParams(template, params) {
    const out = [];
    let i = 0;
    while (i < template.length) {
        const open = template.indexOf('[', i);
        if (open === -1)
            break;
        const close = template.indexOf(']', open);
        if (close === -1)
            break;
        let name = template.slice(open + 1, close);
        if (name.charCodeAt(0) === 46)
            name = name.slice(3);
        const value = params[name];
        out.push(value === undefined ? '' : String(value));
        i = close + 1;
    }
    return out;
}
//# sourceMappingURL=get-pathname.js.map