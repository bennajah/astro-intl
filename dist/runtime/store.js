/**
 * Per-request ambient state, for APIs that take no context argument.
 *
 * Kept in its own module so bundles that only use the explicit-context APIs
 * never pull it in (`sideEffects: false`). The import is guarded because
 * `node:async_hooks` is not available on every Astro runtime.
 */
export const ALS_UNAVAILABLE = 'astro-intl: AsyncLocalStorage is not available on this runtime, so APIs that read the current locale without an explicit context cannot be used. ' +
    'This affects Cloudflare Workers and other runtimes without `node:async_hooks`. Either enable `nodejs_compat`, ' +
    'or pass the locale explicitly: `getRequestLocale(request)` or `getLocale(context)`, or set `context: "explicit"` in the options.';
let storage;
try {
    const { AsyncLocalStorage } = await import('node:async_hooks');
    storage = new AsyncLocalStorage();
}
catch {
    storage = null;
}
/** Whether the current runtime provides an ambient store. */
export function hasAmbientStore() {
    return storage !== null;
}
/**
 * Runs `fn` with `store` visible to the no-argument APIs. Nesting shadows the
 * outer value and restores it on return.
 */
export function runWithStore(store, fn) {
    if (storage === null)
        throw new Error(ALS_UNAVAILABLE);
    return storage.run(store, fn);
}
/** The current request's store, or `undefined` outside `runWithStore`. */
export function getStore() {
    if (storage === null)
        throw new Error(ALS_UNAVAILABLE);
    return storage.getStore();
}
//# sourceMappingURL=store.js.map