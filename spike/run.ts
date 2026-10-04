/**
 * Phase 0 spikes. Every assumption the design depends on is verified here
 * before any of the package is written.
 *
 *   node --experimental-strip-types spike/run.ts
 */
import {results} from './harness.ts';

const SPIKES = [
	['a — prerender expansion (setPrerenderer)', './prerender.ts'],
	['d — AsyncLocalStorage', './als.ts'],
	['e — Vite environments + injectTypes', './envs.ts'],
	['f — package exports with .astro components', './packaging.ts']
];

for (const [title, file] of SPIKES) {
	console.log(`\n=== spike ${title} ===`);
	const before = results.length;
	await import(file);
	console.log(`  → ${results.length - before} checks`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== total: ${results.length - failed.length}/${results.length} passed ===`);
for (const f of failed) console.log(`FAILED  ${f.label}`);
if (failed.length) process.exitCode = 1;
