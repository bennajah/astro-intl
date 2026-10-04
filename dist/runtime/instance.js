let current;
/** Called once by the generated `virtual:astro-intl/config` module. */
export function setTable(table) {
    current = table;
}
export function table() {
    if (current === undefined) {
        throw new Error('astro-intl: the routing configuration has not been loaded yet. This happens when `hasLocale()` is called while the module is being evaluated. ' +
            'Call it from a function or component body instead, after the middleware has run.');
    }
    return current;
}
//# sourceMappingURL=instance.js.map