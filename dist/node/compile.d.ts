import type { RoutingTable } from '../runtime/table.js';
import type { LocaleMeta, Routing } from '../runtime/types.js';
export interface CompileOptions {
    /** normalized Astro `base`, `''` when there is none */
    base: string;
    /** per-locale metadata from the i18n integration options */
    locales?: Readonly<Record<string, LocaleMeta>>;
}
export declare function compileRouting(routing: Routing, options: CompileOptions): RoutingTable;
//# sourceMappingURL=compile.d.ts.map