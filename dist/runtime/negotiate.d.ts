/**
 * `Accept-Language` negotiation.
 *
 * The header is parsed in a single pass without regular expressions and the
 * winning locale index is memoised in a bounded cache, so repeat visitors cost
 * one `Map.get`.
 */
import type { RoutingTable } from './table.js';
/** Returns the locale index that best matches the header, or `-1`. */
export declare function negotiate(header: string, table: RoutingTable): number;
/** Replaces the memoised results, e.g. after the routing config changes in dev. */
export declare function resetNegotiationCache(): void;
//# sourceMappingURL=negotiate.d.ts.map