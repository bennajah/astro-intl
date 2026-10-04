import assert from 'node:assert/strict';
import test from 'node:test';
import {base, expectInvalid, table} from './helpers.ts';
import {resolveRequest} from '../../dist/runtime/resolve.js';

test('static pathnames resolve to the internal route', () => {
	const routing = base(['en', 'fr'], {
		pathnames: {
			'/': '/',
			'/about': {en: '/about', fr: '/a-propos'},
			'/pricing': '/pricing'
		}
	});
	const t = table(routing);

	assert.deepEqual(resolveRequest(new Request('https://x.test/about'), t), {locale: 'en', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/a-propos'), t), {locale: 'fr', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/pricing'), t), {locale: 'en', pathname: '/pricing'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/'), t), {locale: 'en', pathname: '/'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr'), t), {locale: 'fr', pathname: '/'});
});

test('a locale missing from a pathnames entry keeps the internal path', () => {
	const t = table(base(['en', 'fr', 'de'], {pathnames: {'/about': {fr: '/a-propos'}}}));

	assert.deepEqual(resolveRequest(new Request('https://x.test/about'), t), {locale: 'en', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/de/about'), t), {locale: 'de', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/a-propos'), t), {locale: 'fr', pathname: '/about'});
});

test('localePrefix always puts every locale behind a prefix', () => {
	const t = table(base(['en', 'fr'], {localePrefix: 'always', pathnames: {'/about': '/a-propos'}}));

	assert.deepEqual(resolveRequest(new Request('https://x.test/en/about'), t), {locale: 'en', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/a-propos'), t), {locale: 'fr', pathname: '/about'});
});

test('localePrefix never ignores the path locale and detects one', () => {
	const t = table(base(['en', 'fr'], {localePrefix: 'never', pathnames: {'/about': '/about'}}));

	assert.deepEqual(resolveRequest(new Request('https://x.test/about'), t), {locale: 'en', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/about', {headers: {'accept-language': 'fr,en;q=0.8'}}), t), {
		locale: 'fr',
		pathname: '/about'
	});
	// `de` is not a configured locale, so the header has the final say.
	assert.deepEqual(
		resolveRequest(
			new Request('https://x.test/about', {
				headers: {cookie: 'ASTRO_INTL_LOCALE=de', 'accept-language': 'de,fr;q=0.8'}
			}),
			t
		),
		{locale: 'fr', pathname: '/about'}
	);
	// A locale prefix in the path outranks both cookie and header.
	const prefixed = table(base(['en', 'fr'], {localePrefix: 'always', pathnames: {'/about': '/about'}}));
	assert.deepEqual(
		resolveRequest(
			new Request('https://x.test/fr/about', {headers: {cookie: 'ASTRO_INTL_LOCALE=en', 'accept-language': 'en'}}),
			prefixed
		),
		{locale: 'fr', pathname: '/about'}
	);
});

test('trailing slashes, query strings and the base are normalized away', () => {
	const t = table(base(['en', 'fr']), '/docs');

	assert.deepEqual(resolveRequest(new Request('https://x.test/docs/fr/a-propos/'), t), {locale: 'fr', pathname: '/a-propos'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs?a=1'), t), {locale: 'en', pathname: '/'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs'), t), {locale: 'en', pathname: '/'});
});

test('dynamic routes capture single and catch-all parameters', () => {
	const t = table(
		base(['en', 'fr'], {
			pathnames: {
				'/blog/[slug]': {en: '/blog/[slug]', fr: '/articles/[slug]'},
				'/docs/[...path]': {en: '/docs/[...path]', fr: '/documentation/[...path]'}
			}
		})
	);

	assert.deepEqual(resolveRequest(new Request('https://x.test/blog/hello'), t), {locale: 'en', pathname: '/blog/hello'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/articles/hello'), t), {locale: 'fr', pathname: '/blog/hello'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs/a/b/c'), t), {locale: 'en', pathname: '/docs/a/b/c'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/documentation/x'), t), {locale: 'fr', pathname: '/docs/x'});
});

test('the locale prefix is only stripped on a segment boundary', () => {
	const t = table(base(['en', 'fr'], {localePrefix: 'always'}));

	assert.deepEqual(resolveRequest(new Request('https://x.test/france/'), t), {locale: 'en', pathname: '/france'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/fr/beaches'), t), {locale: 'fr', pathname: '/beaches'});
});

test('static paths win over dynamic templates', () => {
	const t = table(
		base(['en'], {
			pathnames: {
				'/[slug]': '/[slug]',
				'/about': '/about'
			}
		})
	);

	assert.deepEqual(resolveRequest(new Request('https://x.test/about'), t), {locale: 'en', pathname: '/about'});
	assert.deepEqual(resolveRequest(new Request('https://x.test/other'), t), {locale: 'en', pathname: '/other'});
});

test('the most specific template wins', () => {
	const t = table(
		base(['en'], {
			pathnames: {
				'/[...all]': '/[...all]',
				'/docs/[...path]': '/docs/[...path]',
				'/docs/[version]/[...path]': '/docs/[version]/[...path]'
			}
		})
	);

	// Three segments beat two, which beat one.
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs/v1/a'), t), {
		locale: 'en',
		pathname: '/docs/v1/a'
	});
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs/intro/a'), t), {
		locale: 'en',
		pathname: '/docs/intro/a'
	});
	assert.deepEqual(resolveRequest(new Request('https://x.test/docs/intro'), t), {
		locale: 'en',
		pathname: '/docs/intro'
	});
	assert.deepEqual(resolveRequest(new Request('https://x.test/anything/else'), t), {
		locale: 'en',
		pathname: '/anything/else'
	});
});

test('invalid configurations are reported together', () => {
	const problems = expectInvalid(
		base(['en', 'en', 'fr'], {
			defaultLocale: 'de',
			localePrefix: 'sometimes' as never,
			pathnames: {'/blog/[slug]': {fr: '/blog/[...slug]'}, 'contact': '/contact'}
		}),
		/duplicate locale|defaultLocale|localePrefix|must start with|segment/
	);

	assert.ok(problems.length >= 4, `expected several problems, got ${problems.length}: ${problems.join(' | ')}`);
});

test('localePrefix never rejects per-locale pathnames', () => {
	expectInvalid(
		base(['en', 'fr'], {localePrefix: 'never', pathnames: {'/about': {en: '/about', fr: '/a-propos'}}}),
		/localePrefix: "never"/
	);
});

test('external URL collisions are reported', () => {
	expectInvalid(
		base(['en', 'fr'], {pathnames: {'/about': {en: '/a-propos', fr: '/about'}, '/about-us': {en: '/a-propos', fr: '/a-propos'}}}),
		/external paths must be unique|used by two different routes/i
	);
});
