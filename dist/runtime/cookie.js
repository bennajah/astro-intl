/**
 * Cookie reading without `Request.cookies` or a split/trim pass.
 * The parser scans for `name=` and accepts only a match at the start of the
 * header or directly after `; `, which is what the cookie grammar allows.
 */
export function readCookie(header, name) {
    const key = name + '=';
    let at = header.indexOf(key);
    while (at !== -1) {
        // A name starts a cookie at the beginning of the header or right after
        // `;` (optionally followed by the space browsers send), never inside
        // another cookie's value.
        const before = at === 0 ? 0 : header.charCodeAt(at - 1);
        const afterSemicolon = before === 59 || (before === 32 /* ' ' */ && at > 1 && header.charCodeAt(at - 2) === 59);
        if (before === 0 || afterSemicolon) {
            const end = header.indexOf(';', at);
            return end === -1 ? header.slice(at + key.length) : header.slice(at + key.length, end);
        }
        at = header.indexOf(key, at + 1);
    }
    return undefined;
}
/** Serializes the locale cookie written after an explicit language switch. */
export function serializeCookie(spec, value) {
    let out = `${spec.name}=${value}; Path=${spec.path}; Max-Age=${spec.maxAge}; SameSite=${spec.sameSite}`;
    return spec.secure ? out + '; Secure' : out;
}
//# sourceMappingURL=cookie.js.map