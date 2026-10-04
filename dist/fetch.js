/**
 * `astro-intl/fetch` — localization for Astro 7's fetch entrypoint.
 *
 * ```ts
 * // src/fetch.ts
 * import {FetchState, astro} from 'astro/fetch';
 * import {localizeRequest} from 'astro-intl/fetch';
 *
 * export default {
 *   fetch: (request) => astro(new FetchState(localizeRequest(request)))
 * };
 * ```
 *
 * The integration installs exactly this composition as `fetchFile` when the
 * project has no fetch entrypoint of its own, so the snippet is only needed in
 * projects that compose their own.
 */
import table from 'virtual:astro-intl/config';
import { localizeRequest as localize } from './runtime/localize.js';
/**
 * Resolves the locale and returns the request Astro should route.
 *
 * The returned request is the one that came in whenever the URL needs no
 * translation, so the common case allocates nothing.
 */
export function localizeRequest(request) {
    return localize(request, table);
}
//# sourceMappingURL=fetch.js.map