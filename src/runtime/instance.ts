/**
 * The active routing table.
 *
 * `astro-intl` is configured entirely in `astro.config`, so the table has to be
 * reachable without the user passing it around. It is published by the virtual
 * config module, which the injected middleware imports before anything else runs.
 */
import type {RoutingTable} from './table.js';

let current: RoutingTable | undefined;

/** Called once by the generated `virtual:astro-intl/config` module. */
export function setTable(table: RoutingTable): void {
	current = table;
}

export function table(): RoutingTable {
	if (current === undefined) {
		throw new Error(
			'astro-intl: the routing configuration has not been loaded yet. This happens when `hasLocale()` is called while the module is being evaluated. ' +
				'Call it from a function or component body instead, after the middleware has run.'
		);
	}
	return current;
}
