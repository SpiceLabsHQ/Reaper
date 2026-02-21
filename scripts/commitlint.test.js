const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Extract the beads-ref rule function from commitlint config.
 *
 * The config exports plugins as an array containing the beadsRefPlugin object.
 * The plugin has a `rules` property with the `beads-ref` rule function.
 */
const commitlintConfig = require('../commitlint.config');
const beadsRefPlugin = commitlintConfig.plugins.find(
  (plugin) =>
    plugin &&
    typeof plugin === 'object' &&
    plugin.rules &&
    plugin.rules['beads-ref']
);
const beadsRefRule = beadsRefPlugin.rules['beads-ref'];

describe('commitlint beads-ref rule', () => {
  describe('chore commits (exempt)', () => {
    it('should return [true, ...] for chore commits without a ref', () => {
      const result = beadsRefRule({ type: 'chore', raw: 'chore: update deps' });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for chore commits even with a ref', () => {
      const result = beadsRefRule({
        type: 'chore',
        raw: 'chore: update deps\n\nRef: reaper-abc',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('non-chore commits with valid ref', () => {
    it('should return [true, ...] for feat with valid Ref: reaper-abc', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat(auth): add login\n\nRef: reaper-abc',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for fix with valid Ref: reaper-123', () => {
      const result = beadsRefRule({
        type: 'fix',
        raw: 'fix(api): correct response\n\nRef: reaper-123',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] for Ref: reaper-a1b2c3 (mixed alphanumeric)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: new feature\n\nRef: reaper-a1b2c3',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('non-chore commits without ref', () => {
    it('should return [false, ...] for feat commit without any ref', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat(auth): add login',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for fix commit without any ref', () => {
      const result = beadsRefRule({
        type: 'fix',
        raw: 'fix: correct typo in readme',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for docs commit without any ref', () => {
      const result = beadsRefRule({
        type: 'docs',
        raw: 'docs: update readme',
      });
      assert.strictEqual(result[0], false);
    });
  });

  describe('invalid ref formats', () => {
    it('should return [false, ...] when ref uses wrong prefix (Refs: instead of Ref:)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nRefs: reaper-abc',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] when ref has uppercase ID (reaper-ABC)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nRef: reaper-ABC',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] when ref has wrong project prefix', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nRef: other-abc',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] when ref is missing the ID after reaper-', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nRef: reaper-',
      });
      assert.strictEqual(result[0], false);
    });
  });

  describe('case sensitivity of Ref: prefix', () => {
    it('should return [false, ...] for lowercase ref: prefix', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nref: reaper-abc',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [false, ...] for uppercase REF: prefix', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nREF: reaper-abc',
      });
      assert.strictEqual(result[0], false);
    });

    it('should return [true, ...] for correctly capitalized Ref: prefix', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add feature\n\nRef: reaper-abc',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('multiline raw commit messages', () => {
    it('should return [true, ...] when ref is on a later line in the body', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: add auth\n\nAdded OAuth2 login flow.\n\nRef: reaper-abc',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] when ref is on the last line after multiple paragraphs', () => {
      const result = beadsRefRule({
        type: 'fix',
        raw: 'fix: resolve race condition\n\nThis was caused by concurrent access.\n\nThe fix adds a mutex lock.\n\nRef: reaper-x9z',
      });
      assert.strictEqual(result[0], true);
    });

    it('should return [true, ...] when ref appears mid-message (multiline flag)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: new feature\n\nRef: reaper-abc\n\nAdditional context here.',
      });
      assert.strictEqual(result[0], true);
    });
  });

  describe('various valid reaper ID formats', () => {
    it('should accept short alphabetic IDs (reaper-abc)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: feature\n\nRef: reaper-abc',
      });
      assert.strictEqual(result[0], true);
    });

    it('should accept purely numeric IDs (reaper-123)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: feature\n\nRef: reaper-123',
      });
      assert.strictEqual(result[0], true);
    });

    it('should accept mixed alphanumeric IDs (reaper-a1b2c3)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: feature\n\nRef: reaper-a1b2c3',
      });
      assert.strictEqual(result[0], true);
    });

    it('should accept single character IDs (reaper-x)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: feature\n\nRef: reaper-x',
      });
      assert.strictEqual(result[0], true);
    });

    it('should accept long IDs (reaper-abcdef123456)', () => {
      const result = beadsRefRule({
        type: 'feat',
        raw: 'feat: feature\n\nRef: reaper-abcdef123456',
      });
      assert.strictEqual(result[0], true);
    });
  });
});
