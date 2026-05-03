const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Extract the github-ref-required rule function from commitlint config.
 *
 * The config exports plugins as an array containing the githubRefPlugin object.
 * The plugin has a `rules` property with the `github-ref-required` rule function.
 */
const commitlintConfig = require('../commitlint.config');
const githubRefPlugin = commitlintConfig.plugins.find(
  (plugin) =>
    plugin &&
    typeof plugin === 'object' &&
    plugin.rules &&
    plugin.rules['github-ref-required']
);
const githubRefRule = githubRefPlugin.rules['github-ref-required'];

describe('commitlint github-ref-required rule', () => {
  describe('chore commits (exempt)', () => {
    it('should return [true, ...] for chore commits without a ref', () => {
      const result = githubRefRule({
        type: 'chore',
        references: [],
        raw: 'chore: update deps',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for chore commits even with a ref', () => {
      const result = githubRefRule({
        type: 'chore',
        references: [{ action: 'Closes', issue: '123', prefix: '#' }],
        raw: 'chore: update deps\n\nCloses #123',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('docs commits (exempt)', () => {
    it('should return [true, ...] for docs commits without a ref', () => {
      const result = githubRefRule({
        type: 'docs',
        references: [],
        raw: 'docs: update readme',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for docs commits even with a ref', () => {
      const result = githubRefRule({
        type: 'docs',
        references: [{ action: 'Closes', issue: '42', prefix: '#' }],
        raw: 'docs: update readme\n\nCloses #42',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('non-exempt commits with valid GitHub issue reference', () => {
    it('should return [true, ...] for feat with Closes #123', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Closes', issue: '123', prefix: '#' }],
        raw: 'feat(auth): add login\n\nCloses #123',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for fix with Fixes #456', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [{ action: 'Fixes', issue: '456', prefix: '#' }],
        raw: 'fix(api): correct response\n\nFixes #456',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for refactor with Resolves #789', () => {
      const result = githubRefRule({
        type: 'refactor',
        references: [{ action: 'Resolves', issue: '789', prefix: '#' }],
        raw: 'refactor: clean up code\n\nResolves #789',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for feat with Close #1', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Close', issue: '1', prefix: '#' }],
        raw: 'feat: new feature\n\nClose #1',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for fix with Fix #99', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [{ action: 'Fix', issue: '99', prefix: '#' }],
        raw: 'fix: resolve bug\n\nFix #99',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for feat with Resolve #7', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Resolve', issue: '7', prefix: '#' }],
        raw: 'feat: new feature\n\nResolve #7',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for test type with Closes #5', () => {
      const result = githubRefRule({
        type: 'test',
        references: [{ action: 'Closes', issue: '5', prefix: '#' }],
        raw: 'test: add coverage\n\nCloses #5',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for perf type with Fixes #100', () => {
      const result = githubRefRule({
        type: 'perf',
        references: [{ action: 'Fixes', issue: '100', prefix: '#' }],
        raw: 'perf: improve speed\n\nFixes #100',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('non-exempt commits without valid GitHub issue reference', () => {
    it('should return [false, ...] for feat commit with no references', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat(auth): add login',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for fix commit with no references', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [],
        raw: 'fix: correct typo',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for refactor commit with no references', () => {
      const result = githubRefRule({
        type: 'refactor',
        references: [],
        raw: 'refactor: clean up code',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for style commit with no references', () => {
      const result = githubRefRule({
        type: 'style',
        references: [],
        raw: 'style: fix indentation',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for ci commit with no references', () => {
      const result = githubRefRule({
        type: 'ci',
        references: [],
        raw: 'ci: update pipeline',
      });
      assert.strictEqual(result[0], false);
    });
  });

  describe('references without an action (action: null) are rejected', () => {
    it('should return [false, ...] when reference has no action (bare mention)', () => {
      // A bare "#123" in message body has action: null
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: null, issue: '123', prefix: '#' }],
        raw: 'feat: add feature\n\nsome text #123',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] when all references have null action', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [
          { action: null, issue: '1', prefix: '#' },
          { action: null, issue: '2', prefix: '#' },
        ],
        raw: 'fix: repair\n\nrelated to #1, see #2',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [true, ...] when at least one reference has an action', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [
          { action: null, issue: '1', prefix: '#' },
          { action: 'Closes', issue: '2', prefix: '#' },
        ],
        raw: 'feat: add feature\n\nrelated to #1\n\nCloses #2',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('multiple references', () => {
    it('should return [true, ...] when multiple action references are present', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [
          { action: 'Closes', issue: '1', prefix: '#' },
          { action: 'Fixes', issue: '2', prefix: '#' },
        ],
        raw: 'feat: squash two issues\n\nCloses #1\nFixes #2',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [false, ...] when no references have an action', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [
          { action: null, issue: '1', prefix: '#' },
          { action: null, issue: '2', prefix: '#' },
        ],
        raw: 'feat: squash\n\nref #1, ref #2',
      });
      assert.strictEqual(result[0], false);
    });
  });

  describe('error message content', () => {
    it('should return a helpful error message when rule fails', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature',
      });
      assert.strictEqual(result[0], false);
      assert.ok(
        typeof result[1] === 'string',
        'error message should be a string'
      );
      assert.ok(result[1].length > 0, 'error message should not be empty');
    });

    it('should return a truthy message when rule passes', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Closes', issue: '1', prefix: '#' }],
        raw: 'feat: add feature\n\nCloses #1',
      });
      assert.strictEqual(result[0], true);
      assert.ok(
        typeof result[1] === 'string',
        'success message should be a string'
      );
    });

    it('error message should mention both GitHub and Linear formats', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature',
      });
      assert.strictEqual(result[0], false);
      assert.match(result[1], /GitHub/i);
      assert.match(result[1], /Linear/i);
    });
  });

  describe('Linear-format issue references (TEAM-N)', () => {
    it('should return [true, ...] for feat with Closes SPC-10', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat(config): add reader\n\nCloses SPC-10',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for fix with Fixes ABC-7', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [],
        raw: 'fix(api): correct response\n\nFixes ABC-7',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for refactor with Resolves PROJ-100', () => {
      const result = githubRefRule({
        type: 'refactor',
        references: [],
        raw: 'refactor: clean up code\n\nResolves PROJ-100',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for feat with Close SPC-1 (singular)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: new feature\n\nClose SPC-1',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for fix with Fix LIN-99 (singular)', () => {
      const result = githubRefRule({
        type: 'fix',
        references: [],
        raw: 'fix: resolve bug\n\nFix LIN-99',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] case-insensitive (closes spc-10)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: thing\n\ncloses spc-10',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for multi-letter team key (TEAM2-5)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: thing\n\nCloses TEAM2-5',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [false, ...] for bare Linear key without action keyword', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature\n\nrelated to SPC-10',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for action keyword without team key', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature\n\ncloses the loop',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for malformed Linear key (no hyphen)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature\n\nCloses SPC10',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for malformed Linear key (no digits)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: 'feat: add feature\n\nCloses SPC-foo',
      });
      assert.strictEqual(result[0], false);
    });
  });

  describe('mixed GitHub + Linear references (either or both is sufficient)', () => {
    it('should return [true, ...] when both Closes #123 and Closes SPC-10 are present', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Closes', issue: '123', prefix: '#' }],
        raw: 'feat: cross-tracker work\n\nCloses #123\nCloses SPC-10',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] when GitHub ref is action-null but Linear ref is valid', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: null, issue: '123', prefix: '#' }],
        raw: 'feat: add\n\nrelated to #123\nCloses SPC-10',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] when only GitHub ref is present (no Linear)', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [{ action: 'Fixes', issue: '5', prefix: '#' }],
        raw: 'feat: add\n\nFixes #5',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('exempt types still pass with Linear-only refs', () => {
    it('chore commits with Linear ref should still pass', () => {
      const result = githubRefRule({
        type: 'chore',
        references: [],
        raw: 'chore: update deps\n\nCloses SPC-99',
      });
      assert.strictEqual(result[0], true);
    });

    it('docs commits with Linear ref should still pass', () => {
      const result = githubRefRule({
        type: 'docs',
        references: [],
        raw: 'docs: update readme\n\nResolves SPC-99',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('robustness', () => {
    it('should not crash when raw is undefined and references is empty', () => {
      const result = githubRefRule({
        type: 'feat',
        references: [],
        raw: undefined,
      });
      assert.strictEqual(result[0], false);
    });

    it('should not crash when references is undefined', () => {
      const result = githubRefRule({
        type: 'feat',
        references: undefined,
        raw: 'feat: thing\n\nCloses SPC-10',
      });
      // Should still pass via Linear ref fallback
      assert.strictEqual(result[0], true);
    });
  });
});
