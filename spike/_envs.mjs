// Spike (e): virtual module resolution per Vite environment + injectTypes.
const VIRTUAL = 'virtual:spike/config';
const RESOLVED = '\0virtual:spike/config';

export const CLIENT_GUARD =
	'astro-intl: `virtual:spike/config` cannot be imported from the client environment. It is server-only.';

export function virtualPlugin() {
	return {
		name: 'spike-intl:virtual',
		resolveId(id) {
			if (id !== VIRTUAL) return;
			const env = this.environment?.name ?? 'unknown';
			if (env === 'client') throw new Error(CLIENT_GUARD);
			return RESOLVED;
		},
		load(id) {
			if (id !== RESOLVED) return;
			const env = this.environment?.name ?? 'unknown';
			return `export const value = ${JSON.stringify({env})};\n`;
		}
	};
}

export default function envs() {
	return {
		name: 'spike-envs',
		hooks: {
			'astro:config:setup'({updateConfig}) {
				updateConfig({vite: {plugins: [virtualPlugin()]}});
			},
			'astro:config:done'({injectTypes}) {
				const url = injectTypes({
					filename: 'spike-intl.d.ts',
					content: 'declare const spikeLocale: string;\n'
				});
				injectTypes({filename: 'spike-intl-map.d.ts', content: `// injected at ${url.pathname}\n`});
			}
		}
	};
}
