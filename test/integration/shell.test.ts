import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {build, cleanup, fixture, read, walk} from './helpers.ts';

after(cleanup);

const ADAPTER = fileURLToPath(new URL('./fake-adapter.mjs', import.meta.url));

/** `output` is appended to exercise both Astro rendering modes. */
function config(output: 'static' | 'server'): string {
	return `
import {defineConfig} from 'astro/config';
import {defineRouting} from 'astro-intl/routing';
import astroIntl from 'astro-intl/integration';
import fakeAdapter from ${JSON.stringify(ADAPTER)};

export default defineConfig({
	output: ${JSON.stringify(output)},
	adapter: ${output === 'server' ? 'fakeAdapter()' : 'undefined'},
	integrations: [
		...${output === 'server' ? '[fakeAdapter()]' : '[]'},
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

/** Prints what the middleware resolved, so the built HTML can be asserted on. */
const PAGE = `---
const {locale, pathname} = Astro.locals;
---
<html><body><p>{locale}|{pathname}</p></body></html>
`;

const PAGES = {
	'src/pages/index.astro': PAGE,
	'src/pages/about.astro': PAGE,
	'src/pages/blog/[slug].astro': `---
export async function getStaticPaths() {
	return [{params: {slug: 'a'}}];
}

const {locale, pathname} = Astro.locals;
---
<html><body><p>{locale}|{pathname}</p></body></html>
`
} as const;

test('a static build renders through the injected middleware, warning-free', () => {
	const dir = fixture({'astro.config.mjs': config('static'), ...PAGES});

	const result = build(dir);
	assert.equal(result.code, 0, result.out);
	assert.doesNotMatch(result.out, /Astro\.request\.headers/);

	assert.deepEqual(walk(dir + '/dist').filter((file) => file.endsWith('.html')), [
		'about/index.html',
		'blog/a/index.html',
		'index.html'
	]);
	assert.match(read(dir, 'dist/about/index.html'), /en\|\/about/);
	assert.match(read(dir, 'dist/blog/a/index.html'), /en\|\/blog\/a/);
});

test('an SSR build inlines the compiled routing table', () => {
	const dir = fixture({'astro.config.mjs': config('server'), ...PAGES});

	const result = build(dir);
	assert.equal(result.code, 0, result.out);

	const server = dir + '/dist/server';
	const files = walk(server).filter((file) => file.endsWith('.mjs'));
	assert.ok(files.length > 0, `expected a server build, got ${walk(server).join(', ')}`);

	// The table is emitted as a plain object literal, so the localized paths and
	// the cookie name are visible in the bundle and no parser or validator ships
	// with it.
	const bundle = files.map((file) => read(server, file)).join('\n');
	assert.match(bundle, /\/a-propos/);
	assert.match(bundle, /\/journal\/\[slug\]/);
	assert.match(bundle, /createMiddleware/);
	assert.doesNotMatch(bundle, /astro-intl\/routing/, 'the compiler must not be in the server bundle');
});

test('the injected middleware is part of the emitted middleware bundle', () => {
	const dir = fixture({
		'astro.config.mjs': config('server'),
		...PAGES,
		'src/middleware.ts': "export const onRequest = (context, next) => next();"
	});

	assert.equal(build(dir).code, 0);

	const bundle = read(dir, 'dist/server/virtual_astro_middleware.mjs');
	assert.match(bundle, /createMiddleware/);
});

test('the project middleware runs after astro-intl and sees the locale', () => {
	const dir = fixture({
		'astro.config.mjs': config('static'),
		'src/pages/index.astro':
			'---\nconst order = Astro.locals.order ?? [];\nconst locale = Astro.locals.locale;\n---\n<html>{locale}:{order.join(",")}</html>\n',
		'src/middleware.ts':
			"export const onRequest = (context, next) => {context.locals.order = [...(context.locals.order ?? []), 'user']; return next();};"
	});

	assert.equal(build(dir).code, 0);
	assert.match(read(dir, 'dist/index.html'), /en:user/);
});

test('the generated table cannot be pulled into the browser', () => {
	const dir = fixture({
		'astro.config.mjs': config('static'),
		'src/pages/index.astro': `---
---
<html><script>
	import {getPathname} from 'astro-intl/navigation';
	document.title = getPathname('fr', '/about');
</script></html>
`
	});

	const result = build(dir);
	assert.notEqual(result.code, 0);
	assert.match(result.out, /is server-only and cannot be imported from the client environment/);
});

test('every configuration problem is reported in one run', () => {
	const dir = fixture({
		'astro.config.mjs': `
import {defineConfig} from 'astro/config';
import {defineRouting} from 'astro-intl/routing';
import astroIntl from 'astro-intl/integration';

export default defineConfig({
	integrations: [
		astroIntl({
			routing: defineRouting({
				locales: ['en', 'en'],
				defaultLocale: 'de',
				pathnames: {'about': '/about'}
			})
		})
	]
});
`,
		'src/pages/index.astro': PAGE
	});

	const result = build(dir);
	assert.notEqual(result.code, 0);
	assert.match(result.out, /duplicate locale "en"/);
	assert.match(result.out, /defaultLocale/);
	assert.match(result.out, /must start with "\/"/);
	assert.match(result.out, /Check the `routing` option/);
});

test('a missing routing option names the fix', () => {
	const dir = fixture({
		'astro.config.mjs': `
import {defineConfig} from 'astro/config';
import astroIntl from 'astro-intl/integration';

export default defineConfig({integrations: [astroIntl({})]});
`,
		'src/pages/index.astro': PAGE
	});

	const result = build(dir);
	assert.notEqual(result.code, 0);
	assert.match(result.out, /`routing` is required/);
	assert.match(result.out, /defineRouting/);
});