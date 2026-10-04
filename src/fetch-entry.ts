/**
 * The generated fetch entrypoint, installed as Astro's `fetchFile`.
 *
 * It is the smallest possible composition: localize the request, then run
 * Astro's own pipeline. Every Astro feature — redirects, sessions, actions,
 * caching, user middleware — keeps working exactly as it does without
 * `astro-intl`, because nothing here replaces the pipeline.
 *
 * This module is never imported by hand; `astro-intl/integration` points Astro's
 * `fetchFile` at it.
 */
import {FetchState, astro} from 'astro/fetch';
import {localizeRequest} from './fetch.js';

export default {
	fetch(request: Request): Promise<Response> {
		return astro(new FetchState(localizeRequest(request)));
	}
};