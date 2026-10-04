/**
 * The active routing table.
 *
 * `astro-intl` is configured entirely in `astro.config`, so the table has to be
 * reachable without the user passing it around. It is published by the virtual
 * config module, which the injected middleware imports before anything else runs.
 */
import type { RoutingTable } from './table.js';
/** Called once by the generated `virtual:astro-intl/config` module. */
export declare function setTable(table: RoutingTable): void;
export declare function table(): RoutingTable;
//# sourceMappingURL=instance.d.ts.map