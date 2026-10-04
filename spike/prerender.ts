/**
 * Spike (a): does wrapping `setPrerenderer` let us expand internal static paths
 * into localized external paths, and control the emitted file location?
 *
 * Also covers (b): does a rewrite survive into `locals` during prerender, and
 * (c): does the wrapper coexist with an adapter prerenderer.
 */
import {copyFileSync, mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {ok, info, root} from './harness.ts';
import {fixture, linkAstro, build, walk, read} from './fixture.ts';

const MIDDLEWARE = `
import {defineMiddleware} from 'astro:middleware';
export const onRequest = defineMiddleware((ctx, next) => {
  ctx.locals.locale = ctx.request.headers.get('x-astro-intl-locale') || 'dev';
  return next();
});
`;

const LAYOUT = `---
const {locale} = Astro.locals;
---
<!doctype html><html lang={locale}><head><title>t</title></head><body><slot /></body></html>
`;

const page = (opts = {}) => {
  const depth = opts.depth ?? '../';
  return `---
import Layout from '${depth}components/Layout.astro';
const {locale} = Astro.locals;
const {slug} = Astro.props;
${opts.static ? `export function getStaticPaths(){return [{params:{slug:'a'},props:{slug:'a'}},{params:{slug:'b'},props:{slug:'b'}}];}` : ''}
${opts.live ? 'export const prerender = false;' : ''}
${opts.prerenderTrue ? 'export const prerender = true;' : ''}
---
<Layout>
  <h1 data-locale={locale}>{Astro.url.pathname}</h1>
  <p>slug:{slug}</p>
</Layout>
`;
};

function baseFiles(config, overrides = {}) {
  return {
    'package.json': JSON.stringify({name: 'fixture', type: 'module', private: true}),
    'astro.config.mjs': `import {defineConfig} from 'astro/config';\nimport intl from './intl.mjs';\nexport default defineConfig(${config ? config.replace(/^\{/, '{integrations: [intl()], ') : '{integrations: [intl()]}'});\n`,
    'src/middleware.ts': MIDDLEWARE,
    'src/components/Layout.astro': LAYOUT,
    'src/pages/index.astro': page(),
    'src/pages/about.astro': page(),
    'src/pages/blog/[slug].astro': page({static: true, depth: '../../'}),
    ...overrides
  };
}

function make(name, config, extra = {}) {
  const dir = fixture(name, {...baseFiles(config, extra.pages), ...extra.files});
  linkAstro(dir);
  copyFileSync(path.join(root, 'spike', '_intl.mjs'), path.join(dir, 'intl.mjs'));
  return dir;
}

function tail(out) {
  return out.split('\n').filter((l) => /error|Error|✘|Cannot|Unexpected/.test(l)).slice(0, 5).join(' | ');
}
if (process.env.SPIKE_DEBUG) process.on('exit', () => {});

// --- run 1: directory format, no base
{
  const dir = make('prerender-basic', `{}`);
  const res = build(dir);
  if (process.env.SPIKE_DEBUG && res.code !== 0) console.error(res.out);
  if (!ok('a.1 prerender wrapper builds', res.code === 0, res.code === 0 ? '' : tail(res.out))) {
  } else {
    const files = walk(path.join(dir, 'dist')).filter((f) => f.endsWith('.html'));
    info('emitted html', files.join(', '));
    ok(
      'a.2 external paths emitted (en unprefixed + /fr)',
      files.includes('about/index.html') &&
        files.includes('fr/a-propos/index.html') &&
        files.includes('fr/index.html') &&
        files.includes('blog/a/index.html') &&
        files.includes('fr/articles/a/index.html'),
      files.join(', ')
    );
    const fr = read(path.join(dir, 'dist'), 'fr/articles/a/index.html');
    ok('a.3 locale forwarded to page via header+locals', fr.includes('data-locale="fr"'), fr.match(/data-locale="[^"]*"/)?.[0]);
    ok('a.4 page renders rewritten internal url', /<h1[^>]*>\/blog\/a\/?<\/h1>/.test(fr), fr.match(/<h1[^>]*>[^<]*/)?.[0]);
    ok('a.5 params preserved through rewrite', fr.includes('slug:a'), '');
    ok('a.6 no duplicate/unexpanded internal pages', !files.includes('about/index.html'.replace('about', 'fr/about/index.html')), '');
  }
}

// --- run 2: trailingSlash: 'never' + build.format 'file'
{
  const dir = make('prerender-never', `{trailingSlash: 'never', build: {format: 'file'}}`);
  const res = build(dir);
  if (!ok('a.7 trailingSlash:never + format:file builds', res.code === 0, res.code === 0 ? '' : tail(res.out))) {
  } else {
    const files = walk(path.join(dir, 'dist')).filter((f) => f.endsWith('.html'));
    info('emitted html', files.join(', '));
    ok(
      'a.8 file format honoured for localized paths',
      files.includes('about.html') && files.includes('fr/a-propos.html') && files.includes('fr/articles/a.html'),
      files.join(', ')
    );
  }
}

// --- run 3: base
{
  const dir = make('prerender-base', `{base: '/docs', trailingSlash: 'always'}`);
  const res = build(dir);
  if (!ok('a.9 base builds', res.code === 0, res.code === 0 ? '' : tail(res.out))) {
  } else {
    const files = walk(path.join(dir, 'dist')).filter((f) => f.endsWith('.html'));
    info('emitted html', files.join(', '));
    ok(
      'a.10 base does not leak into emitted dir layout',
      files.includes('about/index.html') && files.includes('fr/a-propos/index.html'),
      files.join(', ')
    );
  }
}

// --- run 4: hybrid via inline minimal adapter
{
  const dir = make(
    'prerender-hybrid',
    `{output: 'server', adapter: adapter()}`,
    {
      pages: {
        'src/pages/index.astro': page({prerenderTrue: true}),
        'src/pages/about.astro': page({prerenderTrue: true}),
        'src/pages/blog/[slug].astro': page({static: true, depth: '../../', prerenderTrue: true}),
        'src/pages/live.astro': page({live: true})
      },
      files: {
        'adapter.mjs': `export default function adapter(){return {name:'spike-adapter',hooks:{'astro:config:done'({setAdapter}){setAdapter({name:'spike-adapter',serverEntrypoint:'./adapter-entry.mjs',supportedAstroFeatures:{}})}}}};\n`,
        'adapter-entry.mjs': `export const handler = async () => new Response('ok');\n`
      }
    }
  );
  const fs = await import('node:fs');
  const cfgPath = path.join(dir, 'astro.config.mjs');
  fs.writeFileSync(
    cfgPath,
    fs
      .readFileSync(cfgPath, 'utf8')
      .replace(`import intl from './intl.mjs';`, `import intl from './intl.mjs';\nimport adapter from './adapter.mjs';`)
  );
  const res = build(dir);
  if (!ok('a.11 output:server + inline adapter builds', res.code === 0, res.code === 0 ? '' : tail(res.out))) {
  } else {
    const all = walk(path.join(dir, 'dist'));
    const files = all.filter((f) => f.endsWith('.html'));
    info('hybrid output', all.slice(0, 24).join(', '));
    ok(
      'a.12 hybrid: only prerendered routes emitted',
      files.includes('client/fr/a-propos/index.html') && !files.some((f) => f.includes('live')),
      files.join(', ')
    );
    ok(
      'a.13 wrapper coexists with adapter prerenderer',
      all.some((f) => f.startsWith('client/')) && all.some((f) => /entry|prerender/.test(f)),
      all.slice(0, 10).join(', ')
    );
  }
}
