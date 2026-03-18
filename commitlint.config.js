/**
 * Commitlint configuration with conventional commits + GitHub issue reference
 *
 * Requires a GitHub issue reference footer (e.g. "Closes #123", "Fixes #456")
 * in all commits except chore and docs.
 *
 * Uses commitlint's built-in parser which recognises GitHub closing keywords
 * (Closes, Fixes, Resolves, etc.) and populates the `references` array with
 * an `action` field when such a keyword is found.
 */

/**
 * Commit types that are exempt from the GitHub issue reference requirement.
 */
const EXEMPT_TYPES = new Set(['chore', 'docs']);

/**
 * Custom plugin to validate GitHub issue reference in commit footer.
 *
 * A valid reference is one where the parser recognises a closing keyword
 * (Closes, Fixes, Resolves, etc.) before the issue number — indicated by
 * `reference.action !== null` in the parsed references array.
 */
const githubRefPlugin = {
  rules: {
    'github-ref-required': ({ type, references }) => {
      if (EXEMPT_TYPES.has(type)) {
        return [true, `${type} commits are exempt from GitHub issue reference requirement`];
      }

      const hasActionRef = Array.isArray(references) && references.some((r) => r.action !== null);

      if (!hasActionRef) {
        return [
          false,
          'Commit must include a GitHub issue reference in the footer.\n' +
            'Expected format: Closes #123, Fixes #456, or Resolves #789\n' +
            'Tip: Use "gh issue list" to see open issues.\n' +
            'Note: chore and docs commits are exempt from this requirement.',
        ];
      }

      return [true, 'Valid GitHub issue reference found'];
    },
  },
};

module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      issuePrefixes: ['#'],
    },
  },
  plugins: [githubRefPlugin],
  rules: {
    // Require a GitHub issue reference for non-exempt commits
    'github-ref-required': [2, 'always'],
  },
};
