import type { ResolvedRequest } from './runtime/table.js';
export type { ResolvedRequest } from './runtime/table.js';
/** The locale that has been resolved for this request, or `undefined`. */
export declare function getRequestLocale(request: Request): string | undefined;
/**
 * Returns the internal pathname and locale for the request.
 *
 * This is the pure engine: `pathname` is always the internal route path,
 * regardless of what the external URL looked like.
 */
export declare function resolveRequestLocale(request: Request): ResolvedRequest;
//# sourceMappingURL=server.d.ts.map