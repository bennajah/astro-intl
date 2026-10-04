/**
 * Spike (d): can the ambient (no-argument) locale API rely on AsyncLocalStorage,
 * and what happens on runtimes without it?
 *
 * Runs the real `src/als.ts` on Node and Bun, and forces the guarded import to
 * fail with `module.registerHooks` to check the error we throw.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {ok, info, root} from './harness.ts';

const BUN = '/opt/homebrew/bin/bun';

const HARNESS = `
import {hasAmbientStore, runWithStore, getStore, ALS_UNAVAILABLE} from ${JSON.stringify(path.join(root, 'src', 'runtime', 'store.ts'))};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {has: hasAmbientStore(), isolated: null, nested: null, concurrent: null};
await runWithStore({locale: 'fr'}, async () => {
  out.nested = getStore()?.locale;
  await delay(1);
  out.afterAwait = getStore()?.locale;
});
out.isolated = getStore() === undefined;
// two overlapping requests must not see each other's locale
const seen = [];
await Promise.all(
  ['en', 'de'].map((locale) => runWithStore({locale}, async () => {
    await delay(locale === 'en' ? 4 : 1);
    seen.push(getStore().locale);
  }))
);
out.concurrent = seen.sort().join(',');
out.message = ALS_UNAVAILABLE.slice(0, 60);
console.log(JSON.stringify(out));
`;

// --- Node
{
  const res = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', HARNESS], {
    encoding: 'utf8',
    cwd: root
  });
  const raw = (res.stdout || res.stderr || '').trim().split('\n').pop() || '';
  if (process.env.SPIKE_DEBUG) console.error(res.stdout, res.stderr);
  const got = safe(raw);
  info('node', raw);
  ok('d.1 node: AsyncLocalStorage present', got?.has === true, String(got?.has));
  ok('d.2 node: store survives await', got?.afterAwait === 'fr' && got?.nested === 'fr', `${got?.nested}/${got?.afterAwait}`);
  ok('d.3 node: no leak outside run()', got?.isolated === true, String(got?.isolated));
  ok('d.4 node: concurrent requests isolated', got?.concurrent === 'de,en', String(got?.concurrent));
}

// --- Bun
{
  if (exists(BUN)) {
    const res = spawnSync(BUN, ['run', '-'], {encoding: 'utf8', input: HARNESS, cwd: root});
    const raw = (res.stdout || res.stderr || '').trim().split('\n').pop() || '';
    if (process.env.SPIKE_DEBUG) console.error(res.stdout, res.stderr);
    const got = safe(raw);
    info('bun', raw);
    ok('d.5 bun: AsyncLocalStorage present', got?.has === true, String(got?.has));
    ok('d.6 bun: store survives await', got?.afterAwait === 'fr', String(got?.afterAwait));
    ok('d.7 bun: concurrent requests isolated', got?.concurrent === 'de,en', String(got?.concurrent));
  } else {
    ok('d.5 bun: bun binary present', false, `not found at ${BUN}`);
  }
}

// --- runtime without node:async_hooks
{
  const hook = `
import {registerHooks} from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'node:async_hooks') {
      const err = new Error('Cannot find module ' + specifier);
      err.code = 'ERR_MODULE_NOT_FOUND';
      throw err;
    }
    return next(specifier, context);
  }
});
`;
  const probe = `
const {hasAmbientStore} = await import(${JSON.stringify(path.join(root, 'src', 'runtime', 'store.ts'))});
let message = null;
try {
  const m = await import(${JSON.stringify(path.join(root, 'src', 'runtime', 'store.ts'))});
  m.runWithStore({locale: 'en'}, () => {});
} catch (e) { message = e.message; }
console.log(JSON.stringify({has: hasAmbientStore(), message}));
`;
  const res = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', hook + probe], {
    encoding: 'utf8',
    cwd: root
  });
  const raw = (res.stdout || res.stderr || '').trim().split('\n').pop() || '';
  if (process.env.SPIKE_DEBUG) console.error(res.stdout, res.stderr);
  const got = safe(raw);
  info('no-als', raw);
  ok('d.8 missing async_hooks does not crash module load', got?.has === false, String(got?.has));
  ok(
    'd.9 one descriptive error, not a crash',
    typeof got?.message === 'string' && got.message.includes('AsyncLocalStorage') && got.message.includes('explicit'),
    String(got?.message).slice(0, 80)
  );
}

function safe(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function exists(file) {
  return existsSync(file);
}
