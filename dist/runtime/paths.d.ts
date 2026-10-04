/**
 * Shared pathname-template helpers.
 *
 * Used by both the runtime (matching, `getPathname`) and the build-time route
 * compiler so the two can never disagree about what a template means.
 * No regular expressions and no intermediate arrays on the hot path.
 */
import type { DynamicRoute, Kind } from './table.js';
/** Splits `/a/b` into `['a','b']`; `/` becomes `[]`. */
export declare function splitPath(pathname: string): string[];
/** Joins segments back into a pathname, guaranteeing a leading slash. */
export declare function joinPath(segments: readonly string[]): string;
/**
 * Removes the manifest `base` and normalizes to the shape Astro's router
 * expects: leading slash, no trailing slash (except the root).
 */
export declare function normalizePathname(pathname: string, base: string): string;
/** `[slug]` -> `slug`, `[...rest]` -> `rest`. */
export declare function paramName(segment: string): string;
/** Classifies a template segment: 0 literal, 1 `[param]`, 2 `[...rest]`. */
export declare function segmentKind(segment: string): Kind;
/**
 * Matches a concrete external pathname against one dynamic template and returns
 * the captured values in declaration order, or `null` when it does not match.
 */
export declare function matchDynamic(route: DynamicRoute, external: readonly string[], localeIndex: number): string[] | null;
/**
 * Rebuilds the internal pathname by replacing each `[param]` in the internal
 * template with the value captured at the same position.
 */
export declare function buildInternal(route: DynamicRoute, params: readonly string[]): string;
/** `/blog/[slug]` -> `/blog/42`, using the values captured by `matchDynamic`. */
export declare function applyParams(template: string, params: readonly string[]): string;
/**
 * Matches a concrete pathname against an internal template. Used by
 * `getPathname`, where only the internal side of the mapping is known.
 */
export declare function matchTemplate(template: readonly string[], external: readonly string[]): string[] | null;
/** `['articles','[slug]']` -> `/articles/[slug]`. */
export declare function joinTemplate(segments: readonly string[]): string;
/** Prepends a locale prefix, keeping the root path a single segment. */
export declare function withPrefix(prefix: string, external: string): string;
//# sourceMappingURL=paths.d.ts.map