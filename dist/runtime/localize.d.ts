import type { RoutingTable } from './table.js';
/**
 * Returns the request Astro should route.
 *
 * When the external path is already the internal one the very same object comes
 * back, with the resolved locale attached — which is all the middleware needs.
 */
export declare function localizeRequest(request: Request, table: RoutingTable): Request;
//# sourceMappingURL=localize.d.ts.map