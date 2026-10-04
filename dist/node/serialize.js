const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/** Emits a JS literal for any JSON-compatible value. */
function literal(value, indent) {
    if (typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean' || value === null)
        return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0)
            return '[]';
        const items = value.map((item) => literal(item, indent + '\t'));
        return `[\n${items.map((item) => indent + '\t' + item).join(',\n')}\n${indent}]`;
    }
    if (value instanceof Map) {
        if (value.size === 0)
            return 'new Map()';
        const entries = [...value].map(([key, item]) => `[${literal(key, indent + '\t')}, ${literal(item, indent + '\t')}]`);
        return `new Map([\n${entries.map((item) => indent + '\t' + item).join(',\n')}\n${indent}])`;
    }
    const record = value;
    const keys = Object.keys(record);
    if (keys.length === 0)
        return '{}';
    const inner = indent + '\t';
    const body = keys
        .map((key) => `${inner}${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${literal(record[key], inner)}`)
        .join(',\n');
    return `{\n${body}\n${indent}}`;
}
/**
 * Produces the source of `virtual:astro-intl/config`.
 *
 * The table is published on the module instance as well, so importing anything
 * from the package is enough for `hasLocale()` and the server API to work
 * without the user wiring a singleton themselves.
 */
export function serializeRouting(table) {
    const value = literal(table, '\t');
    // The module instance lives next to this file once compiled, so the generated
    // source can import it by absolute URL. That keeps `astro-intl` free of any
    // runtime path resolution.
    const instance = new URL('../runtime/instance.js', import.meta.url).href;
    return [
        `import {setTable} from ${JSON.stringify(instance)};`,
        '',
        `const table = ${value};`,
        '',
        'export default table;',
        'export {table};',
        'export const locales = table.locales;',
        'export const defaultLocale = table.locales[table.def];',
        'export const localePrefix = table.prefix;',
        '',
        '// Publishes the table for `hasLocale()` and the no-argument server API.',
        'setTable(table);'
    ].join('\n');
}
//# sourceMappingURL=serialize.js.map