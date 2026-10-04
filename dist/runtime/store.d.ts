/**
 * Per-request ambient state, for APIs that take no context argument.
 *
 * Kept in its own module so bundles that only use the explicit-context APIs
 * never pull it in (`sideEffects: false`). The import is guarded because
 * `node:async_hooks` is not available on every Astro runtime.
 */
/** What the middleware publishes for the duration of one request. */
export interface RequestStore {
    locale: string;
    pathname: string;
    searchParams?: URLSearchParams;
    [key: string]: unknown;
}
export interface Store {
    readonly locale: string;
    readonly [key: string]: unknown;
}
export declare const ALS_UNAVAILABLE: string;
/** Whether the current runtime provides an ambient store. */
export declare function hasAmbientStore(): boolean;
/**
 * Runs `fn` with `store` visible to the no-argument APIs. Nesting shadows the
 * outer value and restores it on return.
 */
export declare function runWithStore<R>(store: RequestStore, fn: () => R): R;
/** The current request's store, or `undefined` outside `runWithStore`. */
export declare function getStore(): Store | undefined;
//# sourceMappingURL=store.d.ts.map