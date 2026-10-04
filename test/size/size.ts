/**
 * Size harness.
 *
 * Bundles each entrypoint with Vite (already a transitive dev dependency of
 * Astro), minifies with esbuild and reports the minified and gzipped sizes
 * against the budgets in `BUDGETS`. Exits non-zero when a budget is exceeded,
 * so it can run in CI without any extra tooling.
 */
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * One entry per measured unit: a synthetic module re-exporting the real code, so
 * the measurement covers exactly the modules a user would pull in, and nothing
 * that the package never ships together.
 */
const ENTRIES: {name: string; budget: number; source: string}[] = [
	{
		name: 'request resolution core',
		budget: 2_500,
		source: [
			"import {resolveRequest} from 'astro-intl-test/runtime/resolve.js';",
			"import {table} from 'astro-intl-test/runtime/instance.js';",
			'export {resolveRequest, table};'
		].join('\n')
	},
	{
		name: 'getPathname',
		budget: 1_000,
		source: ["export * from 'astro-intl-test/runtime/get-pathname.js';"].join('\n')
	},
	{
		name: 'everything',
		budget: 7_000,
		source: [
			"export * from 'astro-intl-test/index.js';",
			"export * from 'astro-intl-test/routing.js';",
			"export * from 'astro-intl-test/runtime/resolve.js';",
			"export * from 'astro-intl-test/runtime/alternates.js';",
			"export * from 'astro-intl-test/runtime/get-pathname.js';",
			"export * from 'astro-intl-test/runtime/store.js';"
		].join('\n')
	}
];

const virtualPlugin = {
	name: 'astro-intl-size',
	resolveId(id: string) {
		if (id.startsWith('astro-intl-test/')) return `\0${id}`;
		return null;
	},
	load(id: string) {
		if (id.startsWith('\0astro-intl-test/')) {
			return `export * from ${JSON.stringify(path.join(root, 'dist', id.slice('astro-intl-test/'.length)))};`;
		}
		return null;
	}
};

async function measure(source: string): Promise<{min: number; gzip: number}> {
	const {build} = await import('vite');
	const result = (await build({
		logLevel: 'error',
		configFile: false,
		plugins: [virtualPlugin],
		build: {
			write: false,
			minify: 'esbuild',
			target: 'es2022',
			rollupOptions: {
				input: 'size-entry',
				// Without this Vite tree-shakes the entry down to nothing, because
				// nothing consumes the bundle we are only measuring.
				preserveEntrySignatures: 'strict',
				plugins: [{
					name: 'size-entry',
					resolveId(id: string) {
						return id === 'size-entry' ? id : null;
					},
					load(id: string) {
						return id === 'size-entry' ? source : null;
					}
				}]
			}
		}
	})) as {output: {type: string; code: string}[]};

	const code = result.output.find((chunk) => chunk.type === 'chunk')!.code;
	const min = Buffer.byteLength(code);
	return {min, gzip: gzipSync(Buffer.from(code)).length};
}

let failed = false;
const rows: [string, number, number, number, string][] = [];

for (const {name, budget, source} of ENTRIES) {
	try {
		const {min, gzip} = await measure(source);
		const ok = gzip <= budget;
		if (!ok) failed = true;
		rows.push([name, min, gzip, budget, ok ? 'ok' : 'OVER BUDGET']);
	} catch (error) {
		failed = true;
		rows.push([name, 0, 0, budget, `ERROR ${(error as Error).message.split('\n')[0]}`]);
	}
}

const pad = (text: string | number, width: number) => String(text).padStart(width);
console.log(`${'entry'.padEnd(30)}${pad('min', 9)}${pad('gzip', 9)}${pad('budget', 9)}  status`);
for (const row of rows) {
	console.log(`${row[0].padEnd(30)}${pad(row[1], 9)}${pad(row[2], 9)}${pad(row[3], 9)}  ${row[4]}`);
}

process.exit(failed ? 1 : 0);