/**
 * Every configuration problem is collected and reported at once, so a user
 * fixing their routing config never has to rebuild to find the next mistake.
 */
export class IntlConfigError extends Error {
    problems;
    constructor(problems) {
        const bullets = problems.map((problem) => `  • ${problem}`).join('\n');
        super(`astro-intl found ${problems.length} problem${problems.length === 1 ? '' : 's'} in the i18n configuration:\n${bullets}`);
        this.name = 'IntlConfigError';
        this.problems = problems;
    }
}
//# sourceMappingURL=errors.js.map