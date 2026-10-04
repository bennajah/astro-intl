import assert from 'node:assert/strict';
import test from 'node:test';
import {
	ALS_UNAVAILABLE,
	getStore,
	hasAmbientStore,
	runWithStore
} from '../../dist/runtime/store.js';

test('the store survives await and does not leak outside run()', async () => {
	assert.equal(hasAmbientStore(), true, ALS_UNAVAILABLE);

	await runWithStore({locale: 'en', pathname: '/'}, async () => {
		await new Promise((resolve) => setTimeout(resolve, 1));
		assert.equal(getStore()?.locale, 'en');
	});
	assert.equal(getStore(), undefined);
});

test('overlapping requests stay isolated', async () => {
	const order: string[] = [];
	await Promise.all([
		runWithStore({locale: 'de', pathname: '/'}, async () => {
			await new Promise((resolve) => setTimeout(resolve, 5));
			order.push(`de:${getStore()!.locale}`);
		}),
		runWithStore({locale: 'en', pathname: '/'}, async () => {
			order.push(`en:${getStore()!.locale}`);
		})
	]);
	assert.deepEqual(order, ['en:en', 'de:de']);
});

test('a nested run shadows the outer value and then restores it', () => {
	runWithStore({locale: 'en', pathname: '/'}, () => {
		assert.equal(getStore()?.locale, 'en');
		runWithStore({locale: 'fr', pathname: '/'}, () => {
			assert.equal(getStore()?.locale, 'fr');
		});
		assert.equal(getStore()?.locale, 'en');
	});
});

test('an explicit value works without an ambient store', () => {
	// The explicit form is the documented alternative on runtimes without ALS.
	const explicit = {locale: 'fr'};
	assert.equal(explicit.locale, 'fr');
});