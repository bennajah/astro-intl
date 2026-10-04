const CACHE_LIMIT = 50;
const cache = new Map();
const WILDCARD = '*';
const SUBTAG = 45; // '-'
/** Returns the locale index that best matches the header, or `-1`. */
export function negotiate(header, table) {
    const cached = cache.get(header);
    if (cached !== undefined)
        return cached;
    const index = parse(header, table);
    if (cache.size >= CACHE_LIMIT)
        cache.clear();
    cache.set(header, index);
    return index;
}
/** Replaces the memoised results, e.g. after the routing config changes in dev. */
export function resetNegotiationCache() {
    cache.clear();
}
function parse(header, table) {
    const keys = table.keys;
    let start = 0;
    const length = header.length;
    let bestQ = 0;
    let best = -1;
    while (start <= length) {
        let comma = header.indexOf(',', start);
        if (comma === -1)
            comma = length;
        let end = comma;
        let quality = 1;
        const semi = header.indexOf(';', start);
        if (semi !== -1 && semi < comma) {
            end = semi;
            const q = header.indexOf('q', semi);
            // `;q=0.9` — the value starts after the `=`, not after the `q`.
            if (q !== -1 && q + 1 < comma && header.charCodeAt(q + 1) === 61) {
                const value = Number(header.slice(q + 2, comma));
                if (!Number.isNaN(value))
                    quality = value;
            }
        }
        const tag = header.slice(start, end).trim().toLowerCase();
        start = comma + 1;
        // `q=0` is an explicit refusal and a strict `>` keeps the earliest tag
        // winning when two carry the same quality, as RFC 9110 requires.
        if (tag === '' || quality <= bestQ)
            continue;
        const index = tag === WILDCARD ? table.def : matchTag(tag, keys);
        if (index === -1)
            continue;
        bestQ = quality;
        best = index;
    }
    return best;
}
/** Exact match, else the longest configured locale that is a prefix of `tag`. */
function matchTag(tag, keys) {
    let best = -1;
    let bestLength = 0;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === tag)
            return i;
        // A configured `pt-BR` must beat a shorter `pt` when both are present.
        if (key.length < tag.length && key.length > bestLength && tag.charCodeAt(key.length) === SUBTAG && tag.startsWith(key)) {
            best = i;
            bestLength = key.length;
        }
    }
    return best;
}
//# sourceMappingURL=negotiate.js.map