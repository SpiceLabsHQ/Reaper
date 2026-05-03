/**
 * @fileoverview Tests for the memory-guidance.ejs partial.
 *
 * Validates that the partial compiles without EJS errors for every supported
 * role value, that each role produces all five required sections with
 * role-specific terminology, and that omitting the role parameter yields a
 * loud error directive.
 *
 * @example
 * node --test scripts/memory-guidance.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { compileTemplate, config } = require('./build');
const { resetBuildState } = require('./test-helpers');

const PARTIAL_PATH = path.resolve(
  __dirname,
  '..',
  'src',
  'partials',
  'memory-guidance.ejs'
);

/**
 * Compiles the memory-guidance partial with a given role value.
 * Wraps the partial include in a minimal EJS template.
 * @param {string} role - The role parameter value
 * @returns {string} Compiled output
 */
function compileWithRole(role) {
  const wrapper = `<%- include('partials/memory-guidance', { role: '${role}' }) %>`;
  const wrapperPath = path.join(config.srcDir, '_test-wrapper.ejs');
  return compileTemplate(wrapper, {}, wrapperPath);
}

/**
 * Compiles the memory-guidance partial with no role parameter.
 * @returns {string} Compiled output
 */
function compileWithoutRole() {
  const wrapper = `<%- include('partials/memory-guidance') %>`;
  const wrapperPath = path.join(config.srcDir, '_test-wrapper.ejs');
  return compileTemplate(wrapper, {}, wrapperPath);
}

// All valid role values
const VALID_ROLES = [
  'implementer',
  'architect',
  'planner',
  'reviewer',
  'craft',
  'ops',
  'executor',
];

// The five required section headings every role must emit.
const REQUIRED_SECTIONS = [
  'Why you have memory',
  'What to write',
  'What NOT to write',
  'When to write',
  'When to read',
];

beforeEach(() => {
  resetBuildState();
});

// ===========================================================================
// Partial file existence
// ===========================================================================

describe('memory-guidance partial existence', () => {
  it('should exist at src/partials/memory-guidance.ejs', () => {
    assert.ok(
      fs.existsSync(PARTIAL_PATH),
      `Expected partial to exist at ${PARTIAL_PATH}`
    );
  });
});

// ===========================================================================
// Compilation — every role must compile without errors
// ===========================================================================

describe('memory-guidance compilation', () => {
  for (const role of VALID_ROLES) {
    it(`should compile without errors for role: ${role}`, () => {
      const result = compileWithRole(role);
      assert.ok(
        typeof result === 'string' && result.length > 0,
        `Compilation for role "${role}" should produce non-empty output`
      );
    });
  }
});

// ===========================================================================
// Required sections — every role must emit all five section headings
// ===========================================================================

describe('memory-guidance required sections', () => {
  for (const role of VALID_ROLES) {
    for (const section of REQUIRED_SECTIONS) {
      it(`role "${role}" should include section: ${section}`, () => {
        const result = compileWithRole(role);
        assert.ok(
          result.includes(section),
          `Missing section "${section}" in role "${role}"`
        );
      });
    }
  }
});

// ===========================================================================
// CLAUDE.md framing — memory is additive, not a replacement
// ===========================================================================

describe('memory-guidance CLAUDE.md framing', () => {
  for (const role of VALID_ROLES) {
    it(`role "${role}" should frame memory as additive to CLAUDE.md`, () => {
      const result = compileWithRole(role);
      assert.ok(
        result.includes('CLAUDE.md'),
        `Role "${role}" should reference CLAUDE.md as the project source of truth`
      );
    });
  }
});

// ===========================================================================
// Role-specific terminology
// ===========================================================================

describe('memory-guidance role-specific terminology', () => {
  it('implementer should mention recurring root-cause patterns', () => {
    const result = compileWithRole('implementer');
    assert.ok(
      /root[- ]cause/i.test(result),
      'implementer should mention root-cause patterns'
    );
    assert.ok(
      /debug/i.test(result),
      'implementer should mention debugging traps'
    );
  });

  it('architect should mention trade-off decisions and conventions', () => {
    const result = compileWithRole('architect');
    assert.ok(
      /trade-?off/i.test(result),
      'architect should mention trade-off decisions'
    );
    assert.ok(
      /convention/i.test(result),
      'architect should mention conventions'
    );
  });

  it('planner should mention decomposition heuristics and risk patterns', () => {
    const result = compileWithRole('planner');
    assert.ok(
      /decomposition/i.test(result),
      'planner should mention decomposition heuristics'
    );
    assert.ok(/risk/i.test(result), 'planner should mention risk patterns');
  });

  it('reviewer should mention false positives and accepted code smells', () => {
    const result = compileWithRole('reviewer');
    assert.ok(
      /false positive/i.test(result),
      'reviewer should mention false positives'
    );
    assert.ok(
      /code smell/i.test(result),
      'reviewer should mention accepted code smells'
    );
  });

  it('craft should mention prompt anti-patterns and doc style', () => {
    const result = compileWithRole('craft');
    assert.ok(
      /prompt/i.test(result),
      'craft should mention prompt anti-patterns'
    );
    assert.ok(
      /anti-?pattern/i.test(result),
      'craft should mention anti-patterns'
    );
  });

  it('ops should mention incident root causes and production quirks', () => {
    const result = compileWithRole('ops');
    assert.ok(
      /incident/i.test(result),
      'ops should mention incident root causes'
    );
    assert.ok(
      /production/i.test(result),
      'ops should mention production quirks'
    );
  });

  it('executor should be intentionally restrictive and mention orchestrator misuse', () => {
    const result = compileWithRole('executor');
    assert.ok(
      /orchestrator/i.test(result),
      'executor should mention orchestrator misuse patterns'
    );
    // Restrictive language — executor usually does not write
    assert.ok(
      /usually do not write|rarely write|do not write/i.test(result),
      'executor guidance should be restrictive ("usually do not write" or similar)'
    );
  });
});

// ===========================================================================
// Anti-patterns — what NOT to write must surface concrete examples
// ===========================================================================

describe('memory-guidance anti-patterns', () => {
  for (const role of VALID_ROLES) {
    it(`role "${role}" should warn against duplicating CLAUDE.md`, () => {
      const result = compileWithRole(role);
      // The "What NOT to write" section must reference CLAUDE.md duplication
      // as one of the anti-patterns.
      const notSectionStart = result.indexOf('What NOT to write');
      assert.ok(
        notSectionStart >= 0,
        `Role "${role}" should have a "What NOT to write" section`
      );
      const after = result.slice(notSectionStart);
      assert.ok(
        /CLAUDE\.md/.test(after),
        `Role "${role}" should warn against duplicating CLAUDE.md content`
      );
    });
  }
});

// ===========================================================================
// Read discipline — only when relevant, no preloading
// ===========================================================================

describe('memory-guidance read discipline', () => {
  for (const role of VALID_ROLES) {
    it(`role "${role}" should instruct against preloading memory`, () => {
      const result = compileWithRole(role);
      const whenReadStart = result.indexOf('When to read');
      assert.ok(
        whenReadStart >= 0,
        `Role "${role}" should have a "When to read" section`
      );
      const after = result.slice(whenReadStart);
      assert.ok(
        /preload|session start|relevant/i.test(after),
        `Role "${role}" should address preloading or relevance in "When to read"`
      );
    });
  }
});

// ===========================================================================
// Missing role — must produce a loud error directive
// ===========================================================================

describe('memory-guidance missing role', () => {
  it('should emit an explicit error directive when role is omitted', () => {
    const result = compileWithoutRole();
    assert.ok(
      /invalid memory-guidance include/i.test(result),
      'Missing role should produce "invalid memory-guidance include" directive'
    );
    assert.ok(
      /supply a role parameter/i.test(result),
      'Missing role should instruct caller to supply a role parameter'
    );
  });

  it('should emit an explicit error directive when role is unrecognized', () => {
    const result = compileWithRole('bogus-role-name');
    assert.ok(
      /invalid memory-guidance include/i.test(result),
      'Unknown role should produce "invalid memory-guidance include" directive'
    );
  });
});
