import {mkdirSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync, symlinkSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root, astroBin} from './harness.ts';

export function fixture(name, files) {
  const dir = path.join(root, 'spike', '.tmp', name);
  rmSync(dir, {recursive: true, force: true});
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(dir, file);
    mkdirSync(path.dirname(full), {recursive: true});
    writeFileSync(full, content);
  }
  mkdirSync(path.join(dir, 'node_modules'), {recursive: true});
  return dir;
}

export function linkAstro(dir) {
  try {
    symlinkSync(path.join(root, 'node_modules', 'astro'), path.join(dir, 'node_modules', 'astro'));
  } catch {}
}

export function build(dir, args = []) {
  const res = spawnSync(process.execPath, [astroBin, 'build', ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {...process.env, NO_COLOR: '1', ASTRO_TELEMETRY_DISABLED: '1'}
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  if (process.env.SPIKE_DEBUG) console.error(out);
  return {code: res.status, out, stdout: res.stdout || ''};
}

export function walk(dir, base = dir, acc = []) {
  let entries = [];
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

export function read(dir, file) {
  try {
    return readFileSync(path.join(dir, file), 'utf8');
  } catch {
    return '';
  }
}