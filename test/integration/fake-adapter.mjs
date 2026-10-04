/**
 * A minimal server adapter.
 *
 * Astro refuses to build for on-demand rendering without an adapter, and this
 * package must not pull a real adapter in just to test its own build output.
 */
export default function fakeAdapter() {
	return {
		name: 'astro-intl-test-adapter',
		hooks: {
			'astro:config:done'({setAdapter}) {
				setAdapter({
					name: 'astro-intl-test-adapter',
					entrypointResolution: 'auto',
					serverEntrypoint: new URL('./adapter-entry.mjs', import.meta.url).pathname,
					supportedAstroFeatures: {serverOutput: 'stable', sharp: 'stable'}
				});
			}
		}
	};
}