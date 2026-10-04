import assert from 'node:assert/strict';
import test from 'node:test';
import {getPathname} from '../../dist/runtime/get-pathname.js';
import {alternates} from '../../dist/runtime/alternates.js';
import {resolveRequest} from '../../dist/runtime/resolve.js';
import type {RoutingTable} from '../../dist/runtime/table.js';
import {base, table} from './helpers.ts';

function localized(t: RoutingTable): (locale: string, pathname: string, params?: Record<string, string | number>) => string {
	return (locale, pathname, params) => getPathname(t, t.locales.indexOf(locale), pathname, params);
}

test('a static path round-trips through resolve and back', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'always',
			pathnames: {'/': '/', '/about': {en: '/about', fr: '/a-propos'}}
		})
	);
	const url = localized(t);

	assert.equal(url('en', '/'), '/en');
	assert.equal(url('fr', '/'), '/fr');
	assert.equal(url('en', '/about'), '/en/about');
	assert.equal(url('fr', '/about'), '/fr/a-propos');
});

test('as-needed leaves the default locale unprefixed', () => {
	const t = table(base(['en', 'fr'], {pathnames: {'/about': {en: '/about', fr: '/a-propos'}}}));
	const url = localized(t);

	assert.equal(url('en', '/about'), '/about');
	assert.equal(url('fr', '/about'), '/fr/a-propos');
});

test('never strips the prefix on every locale', () => {
	const t = table(base(['en', 'fr'], {localePrefix: 'never', pathnames: {'/about': '/about'}}));
	const url = localized(t);

	assert.equal(url('en', '/about'), '/about');
	assert.equal(url('fr', '/about'), '/about');
});

test('dynamic params are substituted by name or position', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'always',
			pathnames: {
				'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]'},
				'/docs/[...path]': {en: '/docs/[...path]', fr: '/manuel/[...path]'}
			}
		})
	);
	const url = localized(t);

	assert.equal(url('fr', '/blog/[slug]', {slug: 'hello'}), '/fr/journal/hello');
	assert.equal(url('fr', '/blog/[slug]', {slug: 42}), '/fr/journal/42', 'numbers are coerced');
	assert.equal(url('en', '/docs/[...path]', {path: 'a/b/c'}), '/en/docs/a/b/c');
	assert.equal(url('fr', '/docs/[...path]', {path: 'a/b'}), '/fr/manuel/a/b');
});

test('a concrete dynamic path inverts back to the localized URL', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'always',
			pathnames: {'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]'}}
		})
	);
	const url = localized(t);

	assert.equal(url('fr', '/blog/hello'), '/fr/journal/hello');
	assert.equal(url('en', '/blog/hello'), '/en/blog/hello');
});

test('an already-localized pathname is not prefixed twice', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'always',
			pathnames: {'/about': {en: '/about', fr: '/a-propos'}}
		})
	);
	const url = localized(t);

	assert.equal(url('fr', '/fr/a-propos'), '/fr/a-propos');
});

test('unlisted paths keep their internal form', () => {
	const t = table(base(['en', 'fr'], {localePrefix: 'always'}));
	const url = localized(t);

	assert.equal(url('en', '/unmapped/page'), '/en/unmapped/page');
	assert.equal(url('fr', '/unmapped/page'), '/fr/unmapped/page');
});

test('getPathname output is always accepted by resolveRequest', () => {
	const t = table(
		base(['en', 'fr', 'de'], {
			localePrefix: 'always',
			pathnames: {
				'/': '/',
				'/about': {en: '/about', fr: '/a-propos'},
				'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]', de: '/artikel/[slug]'},
				'/docs/[...path]': {en: '/docs/[...path]', fr: '/manuel/[...path]'}
			}
		})
	);

	// [locale, internal template, params, expected internal path after a round trip]
	const cases: [string, string, Record<string, string | number> | undefined, string][] = [
		['en', '/', undefined, '/'],
		['fr', '/', undefined, '/'],
		['de', '/', undefined, '/'],
		['en', '/about', undefined, '/about'],
		['fr', '/about', undefined, '/about'],
		['de', '/about', undefined, '/about'],
		['en', '/blog/[slug]', {slug: 'post-1'}, '/blog/post-1'],
		['fr', '/blog/[slug]', {slug: 'post-1'}, '/blog/post-1'],
		['de', '/blog/[slug]', {slug: 'post-1'}, '/blog/post-1'],
		['en', '/docs/[...path]', {path: 'x/y'}, '/docs/x/y'],
		['fr', '/docs/[...path]', {path: 'x/y'}, '/docs/x/y'],
		['en', '/blog/concrete-slug', undefined, '/blog/concrete-slug'],
		['fr', '/blog/concrete-slug', undefined, '/blog/concrete-slug']
	];

	for (const [locale, pathname, params, expected] of cases) {
		const url = getPathname(t, t.locales.indexOf(locale), pathname, params);
		const resolved = resolveRequest(new Request('https://x.test' + url), t);
		assert.equal(resolved.locale, locale, `${url} resolved to ${resolved.locale}`);
		assert.equal(resolved.pathname, expected, `${url} resolved to ${resolved.pathname}`);
	}
});

test('alternates cover every locale and round-trip', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'as-needed',
			pathnames: {'/about': {en: '/about', fr: '/a-propos'}, '/blog/[slug]': {en: '/blog/[slug]', fr: '/blog/[slug]'}}
		})
	);

	assert.deepEqual(alternates(t, '/about'), [
		{locale: 'en', href: '/about'},
		{locale: 'fr', href: '/fr/a-propos'}
	]);
	assert.deepEqual(alternates(t, '/blog/hello'), [
		{locale: 'en', href: '/blog/hello'},
		{locale: 'fr', href: '/fr/blog/hello'}
	]);
});