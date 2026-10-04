import assert from 'node:assert/strict';
import test from 'node:test';
import {detect, resolveRequest} from '../../dist/runtime/resolve.js';
import {getPathname} from '../../dist/runtime/get-pathname.js';
import type {Routing} from '../../dist/runtime/types.js';
import {base, expectInvalid, table} from './helpers.ts';

const DOMAINS = {
	domains: [
		{domain: 'example.com', defaultLocale: 'en', locales: {en: '/us', fr: '/fr'}},
		{domain: 'example.de', defaultLocale: 'de'}
	]
};

/** `DOMAINS` references `de`, so the config must include it. */
function twoOrThreeLocales(): Routing {
	return base(['en', 'fr', 'de']);
}

test('a domain default locale is used when the path carries no prefix', () => {
	const t = table(base(['en', 'fr', 'de'], DOMAINS));

	assert.deepEqual(resolveRequest(new Request('https://example.com/about', {headers: {host: 'example.com'}}), t), {
		locale: 'en',
		pathname: '/about'
	});
	assert.deepEqual(resolveRequest(new Request('https://example.de/about', {headers: {host: 'example.de'}}), t), {
		locale: 'de',
		pathname: '/about'
	});
});

test('a path prefix inside the matched domain selects the locale', () => {
	const t = table(base(['en', 'fr', 'de'], DOMAINS));

	assert.deepEqual(resolveRequest(new Request('https://example.com/fr/about', {headers: {host: 'example.com'}}), t), {
		locale: 'fr',
		pathname: '/about'
	});
	// `example.de` has no explicit prefixes, so its locales fall back to `/<locale>`.
	assert.deepEqual(resolveRequest(new Request('https://example.de/fr/about', {headers: {host: 'example.de'}}), t), {
		locale: 'fr',
		pathname: '/about'
	});
});

test('an unknown host falls through to cookie and header', () => {
	const t = table(twoOrThreeLocales());

	assert.equal(
		resolveRequest(
			new Request('https://elsewhere.test/about', {
				headers: {host: 'elsewhere.test', 'accept-language': 'fr'}
			}),
			t
		).locale,
		'fr'
	);
	assert.equal(resolveRequest(new Request('https://elsewhere.test/about', {headers: {host: 'elsewhere.test'}}), t).locale, 'en');
});

test('the host header is stripped of its port', () => {
	const t = table(twoOrThreeLocales());
	assert.equal(detect('/about', new Request('https://example.com/about', {headers: {host: 'example.com:4321'}}), t), 0);
});

test('a domain prefix is not mistaken for a longer locale prefix', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'as-needed',
			domains: [{domain: 'example.com', defaultLocale: 'en', locales: {en: '/us', fr: '/fr'}}]
		})
	);

	// `/france` is a normal path, not the `fr` locale.
	assert.deepEqual(resolveRequest(new Request('https://example.com/france', {headers: {host: 'example.com'}}), t), {
		locale: 'en',
		pathname: '/france'
	});
});

test('domain locale prefixes still get localized pathnames', () => {
	const t = table(
		base(['en', 'fr'], {
			localePrefix: 'as-needed',
			pathnames: {'/about': {en: '/about', fr: '/a-propos'}},
			domains: [{domain: 'example.com', defaultLocale: 'en', locales: {en: '/us', fr: '/fr'}}]
		})
	);

	assert.equal(getPathname(t, 0, '/about'), '/about');
	assert.equal(getPathname(t, 1, '/about'), '/fr/a-propos');
});

test('invalid domain configuration is reported', () => {
	expectInvalid(base(['en', 'fr'], {domains: [{domain: '', defaultLocale: 'en'}]}), /non-empty `domain`/);
	expectInvalid(base(['en', 'fr'], {domains: [{domain: 'x.test', defaultLocale: 'de'}]}), /defaultLocale.*"de"/);
});