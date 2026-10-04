/**
 * Ambient declaration for the generated configuration module.
 *
 * The integration replaces this specifier with a compiled routing table during
 * `astro:config:setup`; TypeScript needs to know its shape.
 */
declare module 'virtual:astro-intl/config' {
	import type {RoutingTable} from './runtime/table.js';

	export const table: RoutingTable;
	export const locales: string[];
	export const defaultLocale: string;
	export const localePrefix: 0 | 1 | 2;
	const value: RoutingTable;
	export default value;
}