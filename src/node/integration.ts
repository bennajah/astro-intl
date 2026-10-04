/**
 * `astro-intl/integration` — the Astro integration, and the default export.
 *
 * Zero-config: adding this to `astro.config` is the only setup step. It
 * validates the configuration, generates the routing table as a virtual module
 * and injects the middleware, so users never write one.
 */
import type {AstroIntegration} from 'astro';
import {buildConfigModule, type IntlOptions} from './config.js';
import {IntlConfigError} from './errors.js';
import {resolveFetchFile} from './fetch-file.js';
import {createConfigPlugin} from './plugin.js';

export type {IntlOptions} from './config.js';
export {IntlConfigError} from './errors.js';

/**
 * Astro stores the middleware entrypoint rather than importing it inline, so it
 * has to be a real file. This module imports the generated routing table.
 */
const MIDDLEWARE = new URL('../middleware.js', import.meta.url);

/** Adds a pointer to the place the mistake was made. */
function report(error: unknown): never {
	if (error instanceof IntlConfigError) {
		throw new Error(
			`${error.message}\n\nCheck the \`routing\` option passed to \`astroIntl()\` in your astro.config.`,
			{cause: error}
		);
	}
	throw error;
}

export default function astroIntl(options: IntlOptions): AstroIntegration {
	return {
		name: 'astro-intl',
		hooks: {
			'astro:config:setup'({config, updateConfig, addMiddleware, logger}) {
				let source: string;
				try {
					source = buildConfigModule(options, config.base);
				} catch (error) {
					report(error);
				}

				const fetchFile = resolveFetchFile(config, logger);

				updateConfig({
					vite: {plugins: [createConfigPlugin(() => source)]},
					...(fetchFile === undefined ? {} : {fetchFile})
				});

				// `'pre'` runs before any user middleware, so `Astro.locals.locale`
				// is already set for everything the project itself writes.
				addMiddleware({order: 'pre', entrypoint: MIDDLEWARE});
			}
		}
	};
}