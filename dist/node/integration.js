import { buildConfigModule } from './config.js';
import { IntlConfigError } from './errors.js';
import { resolveFetchFile } from './fetch-file.js';
import { createConfigPlugin } from './plugin.js';
export { IntlConfigError } from './errors.js';
/**
 * Astro stores the middleware entrypoint rather than importing it inline, so it
 * has to be a real file. This module imports the generated routing table.
 */
const MIDDLEWARE = new URL('../middleware.js', import.meta.url);
/** Adds a pointer to the place the mistake was made. */
function report(error) {
    if (error instanceof IntlConfigError) {
        throw new Error(`${error.message}\n\nCheck the \`routing\` option passed to \`astroIntl()\` in your astro.config.`, { cause: error });
    }
    throw error;
}
export default function astroIntl(options) {
    return {
        name: 'astro-intl',
        hooks: {
            'astro:config:setup'({ config, updateConfig, addMiddleware, logger }) {
                let source;
                try {
                    source = buildConfigModule(options, config.base);
                }
                catch (error) {
                    report(error);
                }
                const fetchFile = resolveFetchFile(config, logger);
                updateConfig({
                    vite: { plugins: [createConfigPlugin(() => source)] },
                    ...(fetchFile === undefined ? {} : { fetchFile })
                });
                // `'pre'` runs before any user middleware, so `Astro.locals.locale`
                // is already set for everything the project itself writes.
                addMiddleware({ order: 'pre', entrypoint: MIDDLEWARE });
            }
        }
    };
}
//# sourceMappingURL=integration.js.map