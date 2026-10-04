/**
 * Spike (f): can `.astro` components and server-only JS ship from inside
 * `node_modules` through the package `exports` map, and do they stay free of
 * client JavaScript?
 */
import {mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {ok, info, root} from './harness.ts';
import {fixture, linkAstro, build, walk, read} from './fixture.ts';

// --- the published package shape we intend to ship
const pkg = {
	name: 'astro-intl',
	version: '0.0.0-spike',
	type: 'module',
	sideEffects: false,
	exports: {
		'.': {types: './index.d.ts', default: './index.js'},
		'./components/IntlHead.astro': './components/IntlHead.astro',
		'./components/Link.astro': './components/Link.astro'
	}
};

const INDEX_JS = `const LOCALES = ['en', 'fr'];
export function hasLocale(value) { return typeof value === 'string' && LOCALES.includes(value); }
`;
const INDEX_DTS = `export declare function hasLocale(value: unknown): boolean;\n`;

const INTL_HEAD = `---
const {locale, languages = []} = Astro.props;
---
{languages.map((l) => <link rel="alternate" hreflang={l} href={\`/\${l}\`} />)}
<meta name="x-intl-locale" content={locale} />
`;

const LINK = `---
const {href, locale, ...rest} = Astro.props;
---
<a href={href} data-locale={locale} {...rest}><slot /></a>
`;

function buildPackage(dir) {
	const pkgDir = path.join(dir, 'pkg');
	mkdirSync(path.join(pkgDir, 'components'), {recursive: true});
	writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2));
	writeFileSync(path.join(pkgDir, 'index.js'), INDEX_JS);
	writeFileSync(path.join(pkgDir, 'index.d.ts'), INDEX_DTS);
	writeFileSync(path.join(pkgDir, 'components', 'IntlHead.astro'), INTL_HEAD);
	writeFileSync(path.join(pkgDir, 'components', 'Link.astro'), LINK);
	return pkgDir;
}

const PAGE = `---
import IntlHead from 'astro-intl/components/IntlHead.astro';
import Link from 'astro-intl/components/Link.astro';
import {hasLocale} from 'astro-intl';
const locale = hasLocale('fr') ? 'fr' : 'en';
---
<html lang={locale}>
  <head><title>packaging</title><IntlHead locale={locale} languages={['en', 'fr']} /></head>
  <body><Link href="/fr" locale={locale}>about</Link></body>
</html>
`;

{
	const dir = fixture('packaging', {
		'package.json': JSON.stringify({name: 'fixture', type: 'module', private: true}),
		'astro.config.mjs': `import {defineConfig} from 'astro/config';\nexport default defineConfig({});\n`,
		'src/pages/index.astro': PAGE
	});
	linkAstro(dir);
	const pkgDir = buildPackage(dir);
	mkdirSync(path.join(dir, 'node_modules'), {recursive: true});
	symlinkSync(pkgDir, path.join(dir, 'node_modules', 'astro-intl'), 'dir');

	const res = build(dir);
	if (!ok('f.1 package exports resolve from node_modules', res.code === 0, res.code === 0 ? '' : res.out.split('\n').filter((l) => /error/i.test(l)).slice(0, 4).join(' | '))) {
	} else {
		const html = read(path.join(dir, 'dist'), 'index.html');
		info('rendered', html.slice(0, 260));
		ok('f.2 .astro component from node_modules renders', html.includes('data-locale="fr"'), html.match(/<a[^>]*>/)?.[0]);
		ok('f.3 server-only JS export is importable', html.includes('lang="fr"'), '');
		const scripts = walk(path.join(dir, 'dist')).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
		ok('f.4 zero client JavaScript emitted', scripts.length === 0, scripts.join(', '));
		const manifest = read(path.join(dir, 'dist'), 'index.html');
		ok('f.5 no island/hydration markers', !/astro-island|client:load|astro:hydrate/.test(manifest), '');
	}
}

// --- the components must be reachable through the exports map by subpath
{
	const pkgJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
	const subpaths = Object.keys(pkgJson.exports);
	ok(
		'f.6 exports map exposes each component subpath explicitly',
		subpaths.includes('./components/IntlHead.astro') && subpaths.includes('./components/Link.astro'),
		subpaths.join(' ')
	);
	ok('f.7 package declares no runtime dependencies', !('dependencies' in pkgJson) || Object.keys(pkgJson.dependencies ?? {}).length === 0, JSON.stringify(pkgJson.dependencies ?? {}));
	ok('f.8 package is side-effect free', pkgJson.sideEffects === false, String(pkgJson.sideEffects));
}

