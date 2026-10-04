import type { RoutingTable } from './table.js';
export type PathnameParams = Readonly<Record<string, string | number>>;
export declare function getPathname(table: RoutingTable, localeIndex: number, pathname: string, params?: PathnameParams): string;
//# sourceMappingURL=get-pathname.d.ts.map