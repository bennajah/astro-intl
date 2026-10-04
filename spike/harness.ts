import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const astroBin = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

export function ok(label, pass, detail = '') {
  const line = `${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  results.push({label, pass, detail});
  return pass;
}

export function info(label, detail = '') {
  console.log(`      ${label}${detail ? `: ${detail}` : ''}`);
}

export const results = [];

export function summary(name) {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${name}: ${results.length - failed.length}/${results.length} passed`);
  return failed.length;
}