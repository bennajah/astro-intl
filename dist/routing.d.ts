/**
 * `astro-intl/routing` — declares the routing configuration.
 *
 * The call is an identity function: it exists so the configuration has one
 * canonical shape, and so `createNavigation(routing)` can infer everything from it.
 */
import type { Routing } from './runtime/types.js';
export type { DomainConfig, LocaleCookieConfig, LocalePrefix, Pathnames, Routing } from './runtime/types.js';
export declare function defineRouting<L extends string>(routing: Routing<L>): Routing<L>;
//# sourceMappingURL=routing.d.ts.map