import {compileRouting} from '../../dist/node/compile.js';
import {IntlConfigError} from '../../dist/node/errors.js';
import type {Routing} from '../../dist/runtime/types.js';
import type {RoutingTable} from '../../dist/runtime/table.js';

export function table(routing: Routing, base = ''): RoutingTable {
	return compileRouting(routing, {base});
}

export function request(path: string, headers: Record<string, string> = {}): Request {
	return new Request('https://example.com' + path, {headers});
}

/** Fails with the aggregated error when the configuration is invalid. */
export function expectInvalid(routing: Routing, match: RegExp): string[] {
	try {
		compileRouting(routing, {base: ''});
	} catch (error) {
		if (!(error instanceof IntlConfigError)) throw error;
		const text = error.message;
		if (!match.test(text)) {
			throw new Error(`Expected the error to match ${match}, got:\n${text}`);
		}
		return [...error.problems];
	}
	throw new Error('Expected the configuration to be rejected, but it compiled.');
}

export function base(locales: string[] = ['en', 'fr'], rest: Partial<Routing> = {}): Routing {
	return {locales, defaultLocale: 'en', ...rest};
}
