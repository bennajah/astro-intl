/**
 * End-to-end SSR tests against a real Astro build.
 *
 * Every case sends a request through the emitted server entry, so what is
 * asserted is what a deployed app would actually serve — not what a unit test
 * believes about Astro's pipeline.
 */
import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build, cleanup, fixture} from './helpers.ts';

after(cleanup);

const ADAPTER = fileURLToPath(new URL('./fake-adapter.mjs', import.meta.url));

function config(extra = ''): string {
	return `
import {defineConfig} from 'astro/config';
import {defineRouting} from 'astro-intl/routing';
import astroIntl from 'astro-intl/integration';
import fakeAdapter from ${JSON.stringify(ADAPTER)};

export default defineConfig({
	output: 'server',
	adapter: fakeAdapter(),
	${extra}
	integrations: [
		fakeAdapter(),
		astroIntl({
			routing: defineRouting({
				locales: ['en', 'fr'],
				defaultLocale: 'en',
				localePrefix: 'as-needed',
				localeCookie: {name: 'INTL_LOCALE'},
				pathnames: {
					'/': '/',
					'/about': {en: '/about', fr: '/a-propos'},
					'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]'}
				}
			})
		})
	]
});
`;
}

const PAGE = `---
const {locale, pathname} = Astro.locals;
---
<html><body><p>{locale}|{pathname}</p></body></html>
`;

const PAGES = {
	'src/pages/index.astro': PAGE,
	'src/pages/about.astro': PAGE,
	'src/pages/blog/[slug].astro': PAGE
};

type Handler = (request: Request) => Promise<Response>;

/** Builds the project once and returns the server entrypoint's handler. */
async function server(): Promise<Handler> {
	const dir = fixture({'astro.config.mjs': config(), ...PAGES});
	const result = build(dir);
	assert.equal(result.code, 0, result.out);
	const module_ = (await import(dir + '/dist/server/entry.mjs')) as {handler: Handler};
	return module_.handler;
}

/** Requests a path and returns `status` plus the `locale|pathname` the page saw. */
async function get(handler: Handler, path: string, init?: RequestInit): Promise<[number, string]> {
	const response = await handler(new Request('http://localhost:4321' + path, init));
	const body = await response.text();
	const match = /<p>(.*?)<\/p>/.exec(body);
	return [response.status, match?.[1] ?? ''];
}

test('a localized URL renders the internal route with its own locale', async () => {
	const handler = await server();

	assert.deepEqual(await get(handler, '/'), [200, 'en|/']);
	assert.deepEqual(await get(handler, '/about'), [200, 'en|/about']);
	assert.deepEqual(await get(handler, '/fr/a-propos'), [200, 'fr|/about']);
	assert.deepEqual(await get(handler, '/blog/hello'), [200, 'en|/blog/hello']);
	assert.deepEqual(await get(handler, '/fr/journal/hello'), [200, 'fr|/blog/hello']);
});

test('a locale prefix in the URL outranks the cookie', async () => {
	const handler = await server();

	assert.deepEqual(await get(handler, '/fr/a-propos', {headers: {cookie: 'INTL_LOCALE=en'}}), [200, 'fr|/about']);
	assert.deepEqual(await get(handler, '/about', {headers: {cookie: 'INTL_LOCALE=fr'}}), [200, 'en|/about']);
});

test('an unknown URL is still a 404, in the visitor locale', async () => {
	const handler = await server();

	assert.equal((await get(handler, '/nope'))[0], 404);
	assert.equal((await get(handler, '/fr/nope'))[0], 404);
});

test('a request whose URL needs no translation is handed on untouched', async () => {
	const handler = await server();

	// `Accept-Language` must not override a path that is already localized.
	assert.deepEqual(await get(handler, '/about', {headers: {'accept-language': 'fr-FR,fr;q=0.9'}}), [200, 'en|/about']);
});

test('the generated fetch entrypoint is installed automatically', async () => {
	const dir = fixture({'astro.config.mjs': config(), ...PAGES});
	assert.equal(build(dir).code, 0);

	// The entry has to reach the server bundle, or nothing rewrites localized URLs.
	const module_ = await import(dir + '/dist/server/entry.mjs');
	assert.equal(typeof (module_ as {handler?: unknown}).handler, 'function');
});

test('a project fetch entrypoint is never replaced', async () => {
	const dir = fixture({
		'astro.config.mjs': config(),
		...PAGES,
		'src/fetch.ts': `import {FetchState, astro} from 'astro/fetch';
import {localizeRequest} from 'astro-intl/fetch';

export default {
	fetch: (request) => astro(new FetchState(localizeRequest(request)))
};
`
	});

	const result = build(dir);
	assert.equal(result.code, 0, result.out);
	assert.match(result.out, /Found `fetch\.ts`, which astro-intl will not replace/);

	// The project's own composition is what runs, and it localizes the same way.
	const module_ = (await import(dir + '/dist/server/entry.mjs')) as {handler: Handler};
	assert.deepEqual(await get(module_.handler, '/fr/a-propos'), [200, 'fr|/about']);
});

test('`fetchFile: null` is reported instead of silently breaking localized URLs', async () => {
	const dir = fixture({'astro.config.mjs': config('fetchFile: null,'), ...PAGES});

	const result = build(dir);
	assert.equal(result.code, 0, result.out);
	assert.match(result.out, /`fetchFile` is null/);
});