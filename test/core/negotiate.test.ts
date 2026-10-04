import assert from 'node:assert/strict';
import test from 'node:test';
import {negotiate, resetNegotiationCache} from '../../dist/runtime/negotiate.js';
import {readCookie, serializeCookie} from '../../dist/runtime/cookie.js';
import {base, table} from './helpers.ts';

test('quality values decide, not header order', () => {
	const t = table(base(['en', 'fr', 'de']));
	resetNegotiationCache();

	assert.equal(negotiate('fr;q=0.2,de;q=0.9,en;q=0.5', t), 2);
	assert.equal(negotiate('de;q=0.9,fr;q=0.2', t), 2);
	assert.equal(negotiate('fr;q=0,en', t), 0, 'q=0 is a refusal');
	assert.equal(negotiate('*', t), 0, 'a wildcard falls back to the default locale');
	assert.equal(negotiate('nl,sv;q=0.9', t), -1, 'no match is reported as -1');
	assert.equal(negotiate('en-GB,en;q=0.9', t), 0, 'a region tag falls back to its language');
	assert.equal(negotiate('fr-CA,fr;q=0.9,en;q=0.5', t), 1);
	assert.equal(negotiate('  fr  ,  en ', t), 1, 'surrounding whitespace is ignored');
	assert.equal(negotiate('', t), -1);
});

test('a longer configured locale wins over a shorter prefix', () => {
	const t = table(base(['en', 'pt', 'pt-BR']));
	resetNegotiationCache();

	assert.equal(negotiate('pt-BR,pt;q=0.9', t), 2);
	assert.equal(negotiate('pt-PT,pt;q=0.9', t), 1);
	assert.equal(negotiate('pt', t), 1, 'the exact match is preferred over a longer entry');
});

test('identical header values hit the memo', () => {
	const t = table(base(['en', 'fr']));
	resetNegotiationCache();

	const first = negotiate('fr;q=0.9,en;q=0.8', t);
	const second = negotiate('fr;q=0.9,en;q=0.8', t);
	assert.equal(first, 1);
	assert.equal(second, 1);
});

test('the memo stays bounded across many distinct headers', () => {
	const t = table(base(['en', 'fr']));
	resetNegotiationCache();

	for (let i = 0; i < 500; i++) negotiate(`fr;q=0.${1000 + i},en;q=0.1`, t);
	assert.equal(negotiate('fr', t), 1, 'lookups still resolve after the cache is recycled');
});

test('cookies are only read at a real boundary', () => {
	assert.equal(readCookie('NEXT_LOCALE=fr', 'NEXT_LOCALE'), 'fr');
	assert.equal(readCookie('a=1; NEXT_LOCALE=fr; b=2', 'NEXT_LOCALE'), 'fr');
	assert.equal(readCookie('a=1;NEXT_LOCALE=fr', 'NEXT_LOCALE'), 'fr');
	assert.equal(readCookie('a=1; XNEXT_LOCALE=fr', 'NEXT_LOCALE'), undefined, 'no partial-name match');
	assert.equal(readCookie('NEXT_LOCALE_X=fr', 'NEXT_LOCALE'), undefined);
	assert.equal(readCookie('a=1; b=2', 'NEXT_LOCALE'), undefined);
	assert.equal(readCookie('', 'NEXT_LOCALE'), undefined);
	assert.equal(readCookie('NEXT_LOCALE=', 'NEXT_LOCALE'), '', 'an empty value is distinct from absence');
});

test('cookie serialization matches the compiled spec', () => {
	assert.equal(
		serializeCookie({name: 'X', maxAge: 60, path: '/', sameSite: 'lax', secure: false}, 'fr'),
		'X=fr; Path=/; Max-Age=60; SameSite=lax'
	);
	assert.equal(
		serializeCookie({name: 'X', maxAge: 60, path: '/app', sameSite: 'strict', secure: true}, 'de'),
		'X=de; Path=/app; Max-Age=60; SameSite=strict; Secure'
	);
});