/**
 * Build helpers for the integration tests.
 *
 * Each test gets a throwaway Astro project on disk with `astro` and
 * `astro-intl` symlinked into its `node_modules`, so the fixtures import the
 * package through its real `exports` map rather than through relative paths.
 */
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const astroBin = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

export interface BuildResult {
	code: number;
	out: string;
}

const created: string[] = [];

/** Writes a project and returns its directory. */
export function fixture(files: Record<string, string>): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'astro-intl-'));
	created.push(dir);
	for (const [file, content] of Object.entries(files)) {
		const full = path.join(dir, file);
		mkdirSync(path.dirname(full), {recursive: true});
		writeFileSync(full, content);
	}
	const modules = path.join(dir, 'node_modules');
	mkdirSync(modules, {recursive: true});
	// `astro-intl` is this package's own root; the rest are its dev dependencies.
	for (const [name, from] of [
		['astro-intl', root],
		['astro', path.join(root, 'node_modules', 'astro')]
	] as const) {
		symlinkSync(from, path.join(modules, name), 'dir');
	}
	return dir;
}

export function cleanup(): void {
	for (const dir of created.splice(0)) rmSync(dir, {recursive: true, force: true});
}

export function build(dir: string, args: string[] = []): BuildResult {
	const result = spawnSync(process.execPath, [astroBin, 'build', ...args], {
		cwd: dir,
		encoding: 'utf8',
		env: {...process.env, NO_COLOR: '1', ASTRO_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0'}
	});
	return {code: result.status ?? -1, out: `${result.stdout ?? ''}${result.stderr ?? ''}`};
}

export function sync(dir: string): BuildResult {
	const result = spawnSync(process.execPath, [astroBin, 'sync'], {
		cwd: dir,
		encoding: 'utf8',
		env: {...process.env, NO_COLOR: '1', ASTRO_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0'}
	});
	return {code: result.status ?? -1, out: `${result.stdout ?? ''}${result.stderr ?? ''}`};
}

export function walk(dir: string, base = dir, acc: string[] = []): string[] {
	let entries: string[] = [];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries.sort()) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, base, acc);
		else acc.push(path.relative(base, full).split(path.sep).join('/'));
	}
	return acc;
}

export function read(dir: string, file: string): string {
	try {
		return readFileSync(path.join(dir, file), 'utf8');
	} catch {
		return '';
	}
}