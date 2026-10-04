/**
 * `astro-intl/components` — the Astro components re-exported from the package.
 *
 * Allows `import {Link, IntlHead} from 'astro-intl/components'` in TypeScript
 * while the components themselves are `.astro` files at runtime.
 */
// @ts-ignore: .astro components have no .d.ts
export {default as Link} from './components/Link.astro';
// @ts-ignore: .astro components have no .d.ts
export {default as IntlHead} from './components/IntlHead.astro';