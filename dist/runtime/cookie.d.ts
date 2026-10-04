/**
 * Cookie reading without `Request.cookies` or a split/trim pass.
 * The parser scans for `name=` and accepts only a match at the start of the
 * header or directly after `; `, which is what the cookie grammar allows.
 */
export declare function readCookie(header: string, name: string): string | undefined;
/** Serializes the locale cookie written after an explicit language switch. */
export declare function serializeCookie(spec: CookieOptions, value: string): string;
export interface CookieOptions {
    name: string;
    maxAge: number;
    path: string;
    sameSite: 'lax' | 'strict' | 'none';
    secure: boolean;
}
//# sourceMappingURL=cookie.d.ts.map