/**
 * Decides whether the integration may install its own fetch entrypoint.
 *
 * Astro resolves the request route *before* middleware runs, so a localized URL
 * has to be rewritten before the request reaches Astro's router. In Astro 7 that
 * is only possible from the fetch entrypoint (`src/fetch.ts`), which is why this
 * package installs one by default.
 *
 * Two configurations make that impossible, and both are reported to the user
 * rather than silently ignored:
 *
 * - `fetchFile: null` — the project turned the fetch entrypoint off;
 * - a fetch entrypoint of its own — replacing it would drop the project's code.
 */
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {AstroConfig, AstroIntegrationLogger} from 'astro';

/** Astro documents these extensions for `fetchFile`. */
const EXTENSIONS = ['.ts', '.mts', '.js', '.mjs'];

/** The generated entrypoint, next to this file once compiled. */
const FETCH_ENTRY = new URL('../fetch-entry.js', import.meta.url);

/** Vite resolves POSIX paths on every platform, and Astro concatenates it onto `srcDir`. */
function relativeToSrcDir(srcDir: string): string {
	return path.relative(srcDir, fileURLToPath(FETCH_ENTRY)).split(path.sep).join('/');
}

const CUSTOM_ENTRY_HINT = [
	'A custom fetch entrypoint takes precedence over `astro-intl`, which cannot rewrite',
	'localized URLs for it. Add the localization step to it:',
	'',
	'\timport {FetchState, astro} from \'astro/fetch\';',
	'\timport {localizeRequest} from \'astro-intl/fetch\';',
	'',
	'\texport default {fetch: (request) => astro(new FetchState(localizeRequest(request)))};'
].join('\n');

/**
 * The value for Astro's `fetchFile`, or `undefined` when the project has to opt
 * in itself.
 */
export function resolveFetchFile(config: AstroConfig, logger: AstroIntegrationLogger): string | undefined {
	if (config.fetchFile === null) {
		logger.warn(
			'`fetchFile` is null, so Astro has no fetch entrypoint and localized URLs cannot be rewritten before routing. ' +
				'Remove `fetchFile` from your Astro config, or localize requests yourself with `localizeRequest` from `astro-intl/fetch`.'
		);
		return undefined;
	}

	const name = config.fetchFile ?? 'fetch';
	const srcDir = fileURLToPath(config.srcDir);
	for (const extension of EXTENSIONS) {
		if (!existsSync(path.join(srcDir, name + extension))) continue;
		logger.info(`Found \`${name}${extension}\`, which astro-intl will not replace. ${CUSTOM_ENTRY_HINT}`);
		return undefined;
	}

	return relativeToSrcDir(srcDir);
}