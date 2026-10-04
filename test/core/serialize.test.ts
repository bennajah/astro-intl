import assert from 'node:assert/strict';
import test from 'node:test';
import {compileRouting} from '../../dist/node/compile.js';
import {serializeRouting} from '../../dist/node/serialize.js';
import {setTable} from '../../dist/runtime/instance.js';
import {getPathname} from '../../dist/runtime/get-pathname.js';
import {resolveRequest} from '../../dist/runtime/resolve.js';
import type {RoutingTable} from '../../dist/runtime/table.js';
import {base, table as build} from './helpers.ts';

/** Evaluates the generated module the way Vite would, as a data module. */
async function load(t: RoutingTable): Promise<Record<string, unknown>> {
	const source = serializeRouting(t).replace(
		/^import \{setTable\} from .*$/m,
		`import {setTable} from ${JSON.stringify(new URL('../../dist/runtime/instance.js', import.meta.url).href)};`
	);
	const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
	return (await import(url)) as Record<string, unknown>;
}

test('the serialized module evaluates to an equivalent table', async () => {
	const t = build(
		base(['en', 'fr'], {
			pathnames: {'/about': {fr: '/a-propos'}, '/blog/[slug]': {fr: '/journal/[slug]'}}
		})
	);
	const module = await load(t);
	const restored = module['default'] as RoutingTable;

	assert.deepEqual(restored.locales, t.locales);
	assert.deepEqual(restored.prefixes, t.prefixes);
	assert.equal(restored.def, t.def);
	assert.equal(restored.prefix, t.prefix);
	assert.deepEqual([...restored.routes], [...t.routes]);
	assert.deepEqual(restored.localized.map((map) => [...map]), t.localized.map((map) => [...map]));
	assert.deepEqual(restored.dynamic, t.dynamic);
});

test('the serialized module behaves identically end to end', async () => {
	const t = build(
		base(['en', 'fr', 'de'], {
			localePrefix: 'always',
			pathnames: {
				'/': '/',
				'/about': {en: '/about', fr: '/a-propos', de: '/ueber-uns'},
				'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]', de: '/blog/[slug]'}
			}
		})
	);
	const restored = (await load(t))['default'] as RoutingTable;

	for (const url of ['/en', '/fr', '/de/about', '/fr/journal/hello', '/en/blog/x', '/de/blog/y']) {
		const request = new Request('https://x.test' + url);
		assert.deepEqual(resolveRequest(request, restored), resolveRequest(request, t), url);
	}
	assert.equal(getPathname(restored, 1, '/about'), '/fr/a-propos');
	assert.equal(getPathname(restored, 2, '/blog/[slug]', {slug: 'a'}), '/de/blog/a');
});

test('importing the module publishes the table for hasLocale', async () => {
	const t = build(base(['en', 'fr']));
	setTable(undefined as never);
	const {hasLocale} = await import('../../dist/index.js');

	assert.throws(() => hasLocale('en'), /routing configuration has not been loaded/);
	await load(t);
	assert.equal(hasLocale('fr'), true);
	assert.equal(hasLocale('de'), false);
	assert.equal(hasLocale(42), false);
});

test('the convenience exports mirror the table', async () => {
	const t = build(base(['en', 'de'], {localePrefix: 'always'}));
	const module = await load(t);

	assert.deepEqual(module['locales'], ['en', 'de']);
	assert.equal(module['defaultLocale'], 'en');
	assert.equal(module['localePrefix'], 1);
	assert.deepEqual(module['table'], module['default']);
});