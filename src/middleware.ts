/**
 * `astro-intl/middleware` — the routing middleware.
 *
 * The integration injects this automatically in the zero-config setup. A
 * project that composes its own middleware chain can install it explicitly.
 */
import table from 'virtual:astro-intl/config';
import {createMiddleware} from './runtime/middleware.js';

export type {Middleware, MiddlewareContext, MiddlewareNext, RequestLocale} from './runtime/middleware.js';

/** The middleware to register in `src/middleware.ts`. */
export const onRequest = createMiddleware(table);

export default onRequest;