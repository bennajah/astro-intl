/**
 * Spike (e): can the integration expose a virtual config module to every Vite
 * environment that renders on the server while refusing the client, and can it
 * ship its own ambient types with `injectTypes`?
 */
import {copyFileSync, existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {ok, info, root} from './harness.ts';
import {fixture, linkAstro, build, walk, read} from './fixture.ts';

const PAGE = `---
import {value} from 'virtual:spike/config';
---
<html><body><p data-env={value.env}>{value.env}</p></body></html>
`;

const ADAPTER = `export default function adapter(){return {name:'spike-adapter',hooks:{'astro:config:done'({setAdapter}){setAdapter({name:'spike-adapter',serverEntrypoint:'./adapter-entry.mjs',supportedAstroFeatures:{}})}}}};\n`;
const ADAPTER_ENTRY = `export const handler = async () => new Response('ok');\n`;

function make(name, config, pages) {
	const dir = fixture(name, {
		'package.json': JSON.stringify({name: 'fixture', type: 'module', private: true}),
		'astro.config.mjs': `import {defineConfig} from 'astro/config';\nimport envs from './envs.mjs';\n${config.imports ?? ''}\nexport default defineConfig(${config.body.replace(/^\{/, '{integrations: [envs()], ')});\n`,
		'src/pages/static.astro': page(''),
		...pages,
		...(config.files ?? {})
	});
	linkAstro(dir);
	copyFileSync(path.join(root, 'spike', '_envs.mjs'), path.join(dir, 'envs.mjs'));
	return dir;
}

function page(flag) {
	return `---
import {value} from 'virtual:spike/config';
${flag}
---
<html><body><p data-env={value.env}>{value.env}</p></body></html>
`;
}

const envOf = (html) => html.match(/<p data-env="([^"]*)"/)?.[1] ?? '';

// --- static build: every page renders through the `prerender` environment
{
	const dir = make('envs-static', {body: `{}`}, {});
	const res = build(dir);
	if (!ok('e.1 static build resolves virtual module', res.code === 0, res.code === 0 ? '' : res.out.split('\n').filter((l) => /error/i.test(l)).slice(0, 3).join(' | '))) {
	} else {
		const html = read(path.join(dir, 'dist'), 'static/index.html');
		info('static page env', html.slice(0, 120));
		ok('e.2 virtual module resolved in the prerender environment', envOf(html) === 'prerender', envOf(html));
		const typesDir = path.join(dir, '.astro', 'integrations', 'spike-envs');
		const types = readFileSync(path.join(typesDir, 'spike-intl.d.ts'), 'utf8');
		const astroTypes = readFileSync(path.join(dir, '.astro', 'types.d.ts'), 'utf8');
		ok('e.3 injectTypes wrote the type file', types.includes('spikeLocale'), types.trim());
		ok(
			'e.4 injected types are referenced from .astro/types.d.ts (no env.d.ts edit)',
			astroTypes.includes('integrations/spike-envs/spike-intl.d.ts') &&
				astroTypes.includes('integrations/spike-envs/spike-intl-map.d.ts'),
			astroTypes.trim()
		);
		ok('e.5a both injectTypes calls landed', existsSync(path.join(typesDir, 'spike-intl-map.d.ts')), walk(typesDir).join(', '));
	}
}

// --- hybrid build: prerendered page + on-demand page
{
	const dir = make(
		'envs-hybrid',
		{
			body: `{output: 'server', adapter: adapter()}`,
			imports: `import adapter from './adapter.mjs';\n`,
			files: {'adapter.mjs': ADAPTER, 'adapter-entry.mjs': ADAPTER_ENTRY}
		},
		{
			'src/pages/static.astro': page('export const prerender = true;'),
			'src/pages/live.astro': page('export const prerender = false;')
		}
	);
	const res = build(dir);
	if (!ok('e.5 hybrid build resolves virtual module in both environments', res.code === 0, res.code === 0 ? '' : res.out.split('\n').filter((l) => /error/i.test(l)).slice(0, 3).join(' | '))) {
	} else {
		const outDir = walk(path.join(dir, 'dist'));
		const clientDir = outDir.some((f) => f.startsWith('client/')) ? path.join(dir, 'dist', 'client') : path.join(dir, 'dist');
		const stat = read(clientDir, 'static/index.html');
		info('emitted', outDir.filter((f) => f.endsWith('.html')).join(', '));
		ok('e.6 prerendered page used the prerender environment', envOf(stat) === 'prerender', envOf(stat));
		const serverFiles = outDir.filter((f) => f.startsWith('server/'));
		const withMarker = serverFiles.filter((f) => {
			const body = read(path.join(dir, 'dist'), f);
			return /"env":\s*"ssr"/.test(body);
		});
		ok(
			'e.7 on-demand pages resolve the virtual module in the on-demand environment (`ssr`), inlined into the server bundle',
			withMarker.length > 0,
			`checked ${serverFiles.length} server files`
		);
		ok(
			'e.7b no runtime import of the virtual module survives the build',
			serverFiles.every((f) => !/from\s+["']virtual:spike\/config/.test(read(path.join(dir, 'dist'), f))),
			''
		);
	}
}

// --- the client environment is refused
{
	const {virtualPlugin, CLIENT_GUARD} = await import('./_envs.mjs');
	const plugin = virtualPlugin();
	let thrown = null;
	try {
		plugin.resolveId.call({environment: {name: 'client'}}, 'virtual:spike/config');
	} catch (e) {
		thrown = e;
	}
	ok('e.8 importing the virtual config from the client environment throws', thrown instanceof Error, String(thrown));
	ok('e.9 the client error names the module and the reason', thrown?.message === CLIENT_GUARD, String(thrown?.message));
	const resolved = plugin.resolveId.call({environment: {name: 'ssr'}}, 'virtual:spike/config');
	ok('e.10 non-client environments resolve normally', resolved === '\0virtual:spike/config', String(resolved));
}

