/**
 * The generated configuration module, exposed as `virtual:astro-intl/config`.
 *
 * Resolution is restricted to server-side Vite environments. Importing it from
 * the client throws a named error instead of quietly bundling routing tables
 * into the browser.
 */
import type {Plugin} from 'vite';

const MODULE_ID = 'virtual:astro-intl/config';
const RESOLVED_ID = '\0virtual:astro-intl/config';

const CLIENT_ERROR =
	'astro-intl: `virtual:astro-intl/config` is server-only and cannot be imported from the client environment. ' +
	'Move the call into server code, an Astro component, or a page with `export const prerender = true`.';

/** Vite environments that are allowed to hold the routing table. */
const SERVER_ENVIRONMENTS: ReadonlySet<string> = new Set(['ssr', 'prerender', 'astro', 'node', 'edge']);

export function createConfigPlugin(load: () => string): Plugin {
	// The table is identical for every module in a build, so it is generated once
	// and shared by the `ssr` and `prerender` environments.
	let source: string | undefined;

	return {
		name: 'astro-intl:config',
		enforce: 'pre',
		resolveId(id) {
			if (id !== MODULE_ID) return null;
			const environment = this.environment?.name ?? 'ssr';
			if (environment === 'client') throw new Error(CLIENT_ERROR);
			if (!SERVER_ENVIRONMENTS.has(environment)) {
				throw new Error(
					`astro-intl: the Vite environment "${environment}" cannot load the routing configuration. ` +
						'Server-side environments are: ' +
						[...SERVER_ENVIRONMENTS].join(', ') +
						'.'
				);
			}
			return RESOLVED_ID;
		},
		load(id) {
			if (id !== RESOLVED_ID) return null;
			source ??= load();
			return source;
		}
	};
}