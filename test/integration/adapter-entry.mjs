/**
 * The server entrypoint for the fake adapter in `fake-adapter.mjs`.
 *
 * `createApp()` is the same entrypoint real adapters use: it wires the project's
 * `src/fetch.ts` (and therefore any `astro-intl` fetch handler) into the app, so
 * integration tests can send real requests through the built server.
 */
import {createApp} from 'astro/app/entrypoint';

let app;

export function handler(request, env, ctx) {
	app ??= createApp();
	return app.render(request, {clientAddress: '127.0.0.1', locals: {env, ctx}});
}