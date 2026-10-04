/**
 * Benchmark harness.
 *
 * Measures the request-resolution paths that run on every request and the
 * negotiation memo, then compares the result against `bench/baseline.json`.
 * Exits non-zero when any case regresses by more than the allowed margin, so a
 * performance regression fails CI rather than going unnoticed.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'bench', 'baseline.json');

/** A case may be this much slower than its baseline before it is a failure. */
const TOLERANCE = 0.2;
/** Microseconds per operation, below which a measurement is treated as noise. */
const FLOOR = 0.05;

const {compileRouting} = await import(path.join(root, 'dist/node/compile.js'));
const {resolveRequest} = await import(path.join(root, 'dist/runtime/resolve.js'));
const {getPathname} = await import(path.join(root, 'dist/runtime/get-pathname.js'));
const {alternates} = await import(path.join(root, 'dist/runtime/alternates.js'));
const {negotiate} = await import(path.join(root, 'dist/runtime/negotiate.js'));

const t = compileRouting(
	{
		locales: ['en', 'fr', 'de'],
		defaultLocale: 'en',
		localePrefix: 'as-needed',
		pathnames: {
			'/': '/',
			'/about': {en: '/about', fr: '/a-propos', de: '/ueber-uns'},
			'/blog': {en: '/blog', fr: '/journal', de: '/blog'},
			'/blog/[slug]': {en: '/blog/[slug]', fr: '/journal/[slug]', de: '/blog/[slug]'},
			'/docs/[...path]': '/docs/[...path]'
		}
	},
	{base: ''}
);

/** Keeps the measured work observable so the JIT cannot delete it. */
let sink: unknown;

function time(fn: () => unknown, iterations: number): number {
	// Warmup keeps the JIT out of the measurement.
	for (let i = 0; i < Math.min(iterations, 50_000); i++) sink = fn();
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) sink = fn();
	return Number(process.hrtime.bigint() - start) / iterations / 1000;
}

/** Runs a case repeatedly and keeps the fastest sample, so scheduler noise cannot decide it. */
function measure(fn: () => unknown, target_us: number): number {
	let best = Infinity;
	for (let attempt = 0; attempt < 5; attempt++) {
		const value = time(fn, target_us > 1 ? 200_000 : 2_000_000);
		if (value < best) best = value;
	}
	return best;
}

const staticRequest = new Request('https://example.com/about');
const dynamicRequest = new Request('https://example.com/journal/hello-world');
const catchAllRequest = new Request('https://example.com/docs/a/b/c');
const negotiationRequest = new Request('https://example.com/', {
	headers: {'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'}
});
negotiate('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7', t);

const cases: {name: string; run: () => unknown; target: number; limit: number}[] = [
	{
		name: 'static route hit',
		run: () => resolveRequest(staticRequest, t),
		target: 5,
		limit: 5
	},
	{
		name: 'dynamic route hit',
		run: () => resolveRequest(dynamicRequest, t),
		target: 10,
		limit: 10
	},
	{
		name: 'catch-all route hit',
		run: () => resolveRequest(catchAllRequest, t),
		target: 10,
		limit: 10
	},
	{
		name: 'Accept-Language negotiation (cached)',
		run: () => negotiate('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7', t),
		target: 1,
		limit: 1
	},
	{
		name: 'negotiation on a full request',
		run: () => resolveRequest(negotiationRequest, t),
		target: 10,
		limit: 10
	},
	{
		name: 'getPathname (static)',
		run: () => getPathname(t, 1, '/about'),
		target: 1,
		limit: 1
	},
	{
		name: 'getPathname (dynamic)',
		run: () => getPathname(t, 2, '/blog/[slug]', {slug: 'hello'}),
		target: 1.5,
		limit: 1.5
	},
	{
		name: 'alternates for every locale',
		run: () => alternates(t, '/about'),
		target: 3,
		limit: 3
	}
];

const results: Record<string, number> = {};
let failed = false;

const baseline: Record<string, number> = existsSync(BASELINE)
	? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, number>)
	: {};

console.log(`${'case'.padEnd(36)}${pad('µs/op', 10)}${pad('baseline', 10)}${pad('change', 10)}status`);
for (const testCase of cases) {
	const value = measure(testCase.run, testCase.target);
	results[testCase.name] = Number(value.toFixed(4));
	const before = baseline[testCase.name];
	let status = 'ok';
	if (value > testCase.limit) {
		status = `OVER ${testCase.limit}µs LIMIT`;
		failed = true;
	} else if (before !== undefined && before > FLOOR && value > before * (1 + TOLERANCE)) {
		status = `REGRESSION (${(((value - before) / before) * 100).toFixed(1)}%)`;
		failed = true;
	} else if (before === undefined) {
		status = 'new baseline';
	}
	const change = before === undefined ? '—' : `${(((value - before) / before) * 100 >= 0 ? '+' : '') + (((value - before) / before) * 100).toFixed(1)}%`;
	console.log(`${testCase.name.padEnd(36)}${pad(value.toFixed(3), 10)}${pad(before === undefined ? '—' : before.toFixed(3), 10)}${pad(change, 10)}${status}`);
}

if (process.argv.includes('--update')) {
	writeFileSync(BASELINE, JSON.stringify(results, null, '\t') + '\n');
	console.log('\nbaseline updated');
}

if (sink === Symbol.iterator) console.log('unreachable');

process.exit(failed ? 1 : 0);

function pad(text: string | number, width: number): string {
	return String(text).padStart(width);
}