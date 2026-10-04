/**
 * `astro-intl/integration` — the Astro integration, and the default export.
 *
 * Zero-config: adding this to `astro.config` is the only setup step. It
 * validates the configuration, generates the routing table as a virtual module
 * and injects the middleware, so users never write one.
 */
import type { AstroIntegration } from 'astro';
import { type IntlOptions } from './config.js';
export type { IntlOptions } from './config.js';
export { IntlConfigError } from './errors.js';
export default function astroIntl(options: IntlOptions): AstroIntegration;
//# sourceMappingURL=integration.d.ts.map