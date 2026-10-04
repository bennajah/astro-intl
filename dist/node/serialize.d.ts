/**
 * Serializes the compiled routing table into JavaScript source.
 *
 * The runtime therefore reads a plain object literal instead of running any
 * schema validation or parser at request time. Everything that can be checked
 * has already been checked by `compileRouting`.
 */
import type { RoutingTable } from '../runtime/table.js';
/**
 * Produces the source of `virtual:astro-intl/config`.
 *
 * The table is published on the module instance as well, so importing anything
 * from the package is enough for `hasLocale()` and the server API to work
 * without the user wiring a singleton themselves.
 */
export declare function serializeRouting(table: RoutingTable): string;
//# sourceMappingURL=serialize.d.ts.map