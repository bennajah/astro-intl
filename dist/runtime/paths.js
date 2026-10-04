const OPEN = 91; // '['
const DOT = 46; // '.'
const SLASH = 47; // '/'
/** Splits `/a/b` into `['a','b']`; `/` becomes `[]`. */
export function splitPath(pathname) {
    let start = 0;
    let i = pathname.indexOf('/', 1);
    if (i === -1)
        return pathname === '/' || pathname === '' ? [] : [pathname.slice(1)];
    const out = [];
    while (i !== -1) {
        out.push(pathname.slice(start + 1, i));
        start = i;
        i = pathname.indexOf('/', i + 1);
    }
    out.push(pathname.slice(start + 1));
    return out;
}
/** Joins segments back into a pathname, guaranteeing a leading slash. */
export function joinPath(segments) {
    return segments.length === 0 ? '/' : '/' + segments.join('/');
}
/**
 * Removes the manifest `base` and normalizes to the shape Astro's router
 * expects: leading slash, no trailing slash (except the root).
 */
export function normalizePathname(pathname, base) {
    let out = pathname;
    if (base !== '') {
        if (out === base)
            out = '/';
        else if (out.startsWith(base))
            out = out.slice(base.length) || '/';
    }
    if (out.charCodeAt(0) !== SLASH)
        out = '/' + out;
    let end = out.length;
    while (end > 1 && out.charCodeAt(end - 1) === SLASH)
        end--;
    return end === out.length ? out : out.slice(0, end);
}
/** `[slug]` -> `slug`, `[...rest]` -> `rest`. */
export function paramName(segment) {
    const end = segment.indexOf(']');
    const inner = segment.slice(1, end === -1 ? undefined : end);
    return inner.charCodeAt(0) === DOT ? inner.slice(3) : inner;
}
/** Classifies a template segment: 0 literal, 1 `[param]`, 2 `[...rest]`. */
export function segmentKind(segment) {
    if (segment.charCodeAt(0) !== OPEN)
        return 0;
    return segment.charCodeAt(1) === DOT ? 2 : 1;
}
/**
 * Matches a concrete external pathname against one dynamic template and returns
 * the captured values in declaration order, or `null` when it does not match.
 */
export function matchDynamic(route, external, localeIndex) {
    const kinds = route.kinds;
    const last = kinds.length - 1;
    const hasRest = last >= 0 && kinds[last] === 2;
    const fixed = hasRest ? last : kinds.length;
    if (hasRest ? external.length < fixed : external.length !== fixed)
        return null;
    const literals = route.external[localeIndex];
    for (let i = 0; i < fixed; i++) {
        if (kinds[i] === 0 && external[i] !== literals[i])
            return null;
    }
    const out = [];
    let e = 0;
    for (let i = 0; i < fixed; i++) {
        if (kinds[i] !== 0)
            out.push(external[e]);
        e++;
    }
    if (hasRest)
        out.push(external.slice(fixed).join('/'));
    return out;
}
/**
 * Rebuilds the internal pathname by replacing each `[param]` in the internal
 * template with the value captured at the same position.
 */
export function buildInternal(route, params) {
    const kinds = route.kinds;
    let out = '';
    let p = 0;
    for (let i = 0; i < kinds.length; i++) {
        const kind = kinds[i];
        if (kind === 0) {
            out += '/' + route.internal[i];
            continue;
        }
        const value = params[p++];
        // A `[...rest]` that matched nothing contributes no segment at all.
        if (kind === 2 && value === '')
            continue;
        out += '/' + value;
    }
    return out === '' ? '/' : out;
}
/** `/blog/[slug]` -> `/blog/42`, using the values captured by `matchDynamic`. */
export function applyParams(template, params) {
    let out = '';
    let i = 0;
    let p = 0;
    while (i < template.length) {
        const open = template.indexOf('[', i);
        if (open === -1) {
            out += template.slice(i);
            break;
        }
        const close = template.indexOf(']', open);
        if (close === -1) {
            out += template.slice(i);
            break;
        }
        out += template.slice(i, open) + params[p++];
        i = close + 1;
    }
    return out;
}
/**
 * Matches a concrete pathname against an internal template. Used by
 * `getPathname`, where only the internal side of the mapping is known.
 */
export function matchTemplate(template, external) {
    const last = template.length - 1;
    const hasRest = last >= 0 && segmentKind(template[last]) === 2;
    const fixed = hasRest ? last : template.length;
    if (hasRest ? external.length < fixed : external.length !== fixed)
        return null;
    const out = [];
    let e = 0;
    for (let i = 0; i < fixed; i++) {
        const kind = segmentKind(template[i]);
        if (kind === 0) {
            if (external[i] !== template[i])
                return null;
        }
        else {
            out.push(external[e]);
        }
        e++;
    }
    if (hasRest)
        out.push(external.slice(fixed).join('/'));
    return out;
}
/** `['articles','[slug]']` -> `/articles/[slug]`. */
export function joinTemplate(segments) {
    return joinPath(segments);
}
/** Prepends a locale prefix, keeping the root path a single segment. */
export function withPrefix(prefix, external) {
    if (prefix === '')
        return external;
    return external === '/' ? prefix : prefix + external;
}
//# sourceMappingURL=paths.js.map