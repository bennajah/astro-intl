/**
 * Copies the non-TypeScript build artifacts (`.astro` components) into `dist`.
 * `tsc` only emits `.ts`, and `astro-intl` ships its components inside the
 * package, so they have to be placed next to the compiled modules.
 */
import {cpSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'src', 'components');
const to = path.join(root, 'dist', 'components');

mkdirSync(to, {recursive: true});
cpSync(path.join(from, 'Link.astro'), path.join(to, 'Link.astro'));
cpSync(path.join(from, 'IntlHead.astro'), path.join(to, 'IntlHead.astro'));
