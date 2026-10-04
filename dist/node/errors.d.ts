/**
 * Every configuration problem is collected and reported at once, so a user
 * fixing their routing config never has to rebuild to find the next mistake.
 */
export declare class IntlConfigError extends Error {
    readonly problems: readonly string[];
    constructor(problems: readonly string[]);
}
//# sourceMappingURL=errors.d.ts.map