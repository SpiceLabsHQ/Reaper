/**
 * Commitlint configuration with conventional commits + issue reference requirement.
 *
 * Requires an issue reference footer in all commits except chore and docs.
 * Accepts BOTH formats (one or both is sufficient):
 *   - GitHub: "Closes #123", "Fixes #456", "Resolves #789"
 *   - Linear: "Closes SPC-10", "Fixes ABC-7", "Resolves PROJ-100"
 *
 * GitHub refs are detected by commitlint's built-in parser, which populates
 * `references[].action` when a closing keyword precedes the issue number.
 * Linear refs are detected by regex on the raw commit message.
 */

const EXEMPT_TYPES = new Set(['chore', 'docs']);

const ACTION_KEYWORDS = [
  'close',
  'closes',
  'closed',
  'fix',
  'fixes',
  'fixed',
  'resolve',
  'resolves',
  'resolved',
];

// Linear-style action ref: "Closes SPC-10", "Fixes ABC-7", "Resolves PROJ-100".
// Team key: uppercase letter followed by uppercase alphanumerics, hyphen, digits.
const LINEAR_REF_REGEX = new RegExp(
  `\\b(?:${ACTION_KEYWORDS.join('|')})\\s+[A-Z][A-Z0-9]*-\\d+\\b`,
  'i'
);

const githubRefPlugin = {
  rules: {
    'github-ref-required': ({ type, references, raw }) => {
      if (EXEMPT_TYPES.has(type)) {
        return [
          true,
          `${type} commits are exempt from issue reference requirement`,
        ];
      }

      const hasGithubRef =
        Array.isArray(references) && references.some((r) => r.action !== null);
      const hasLinearRef =
        typeof raw === 'string' && LINEAR_REF_REGEX.test(raw);

      if (hasGithubRef || hasLinearRef) {
        return [
          true,
          'Valid issue reference (GitHub #N or Linear TEAM-N) found',
        ];
      }

      return [
        false,
        'Commit must include a GitHub or Linear issue reference in the footer.\n' +
          '  GitHub format: Closes #123, Fixes #456, or Resolves #789\n' +
          '  Linear format: Closes SPC-10, Fixes ABC-7, or Resolves PROJ-100\n' +
          'Either format (or both) is accepted.\n' +
          'Note: chore and docs commits are exempt from this requirement.',
      ];
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
    // Require an issue reference (GitHub #N or Linear TEAM-N) for non-exempt commits
    'github-ref-required': [2, 'always'],
  },
};
