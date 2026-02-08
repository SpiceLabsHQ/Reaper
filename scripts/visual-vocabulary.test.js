/**
 * @fileoverview Tests for the visual-vocabulary.ejs partial.
 *
 * Validates that the partial compiles without EJS errors for every supported
 * context value and that each context produces the expected content sections.
 *
 * @example
 * node --test scripts/visual-vocabulary.test.js
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
  'visual-vocabulary.ejs'
);

/**
 * Compiles the visual-vocabulary partial with a given context value.
 * Wraps the partial include in a minimal EJS template.
 * @param {string} context - The context parameter value
 * @returns {string} Compiled output
 */
function compileWithContext(context) {
  const wrapper = `<%- include('partials/visual-vocabulary', { context: '${context}' }) %>`;
  const wrapperPath = path.join(config.srcDir, '_test-wrapper.ejs');
  return compileTemplate(wrapper, {}, wrapperPath);
}

// All valid context values
const VALID_CONTEXTS = [
  'takeoff',
  'ship',
  'status-worktrees',
  'squadron',
  'functional',
];

beforeEach(() => {
  resetBuildState();
});

// ===========================================================================
// Partial file existence
// ===========================================================================

describe('visual-vocabulary partial existence', () => {
  it('should exist at src/partials/visual-vocabulary.ejs', () => {
    assert.ok(
      fs.existsSync(PARTIAL_PATH),
      `Expected partial to exist at ${PARTIAL_PATH}`
    );
  });
});

// ===========================================================================
// Compilation — every context must compile without errors
// ===========================================================================

describe('visual-vocabulary compilation', () => {
  for (const context of VALID_CONTEXTS) {
    it(`should compile without errors for context: ${context}`, () => {
      const result = compileWithContext(context);
      assert.ok(
        typeof result === 'string' && result.length > 0,
        `Compilation for context "${context}" should produce non-empty output`
      );
    });
  }
});

// ===========================================================================
// Gauge vocabulary — present in every context
// ===========================================================================

describe('visual-vocabulary gauge states', () => {
  for (const context of VALID_CONTEXTS) {
    it(`should include all five gauge states for context: ${context}`, () => {
      const result = compileWithContext(context);
      assert.ok(result.includes('LANDED'), `Missing LANDED state in ${context}`);
      assert.ok(
        result.includes('IN FLIGHT'),
        `Missing IN FLIGHT state in ${context}`
      );
      assert.ok(
        result.includes('ON APPROACH'),
        `Missing ON APPROACH state in ${context}`
      );
      assert.ok(
        result.includes('TAXIING'),
        `Missing TAXIING state in ${context}`
      );
      assert.ok(result.includes('FAULT'), `Missing FAULT state in ${context}`);
    });
  }
});

// ===========================================================================
// ON APPROACH gauge state specifics
// ===========================================================================

describe('visual-vocabulary ON APPROACH gauge details', () => {
  it('should describe five semantic states (not four)', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('Five semantic states'),
      'Introductory text should say "Five semantic states"'
    );
    assert.ok(
      !result.includes('Four semantic states'),
      'Should no longer say "Four semantic states"'
    );
  });

  it('should show ON APPROACH gauge bar (8 filled, 2 empty) in non-functional contexts', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('████████░░'),
      'ON APPROACH gauge bar should be 8 filled + 2 empty blocks'
    );
  });

  it('should include ON APPROACH gloss "coding done, quality gates running" in non-functional contexts', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('coding done, quality gates running'),
      'ON APPROACH gloss should be "coding done, quality gates running"'
    );
  });

  it('should show plain-text ON APPROACH label in functional context', () => {
    const result = compileWithContext('functional');
    assert.ok(
      result.includes('ON APPROACH'),
      'functional context should include ON APPROACH label'
    );
    assert.ok(
      result.includes('coding done, quality gates running'),
      'functional context should include ON APPROACH gloss'
    );
  });

  it('should NOT include gauge bars in functional context ON APPROACH entry', () => {
    const result = compileWithContext('functional');
    assert.ok(
      !result.includes('████████░░'),
      'functional context should not contain ON APPROACH gauge bar'
    );
  });
});

// ===========================================================================
// Fleet dashboard sort order with ON APPROACH
// ===========================================================================

describe('visual-vocabulary fleet dashboard sort order', () => {
  it('should sort ON APPROACH between IN FLIGHT and TAXIING in fleet dashboard', () => {
    const result = compileWithContext('status-worktrees');
    const faultIndex = result.indexOf('FAULT');
    const inFlightIndex = result.indexOf('IN FLIGHT');
    const onApproachIndex = result.indexOf('ON APPROACH');
    const taxiingIndex = result.indexOf('TAXIING');
    const landedIndex = result.indexOf('LANDED');

    assert.ok(faultIndex >= 0, 'FAULT should be present');
    assert.ok(inFlightIndex >= 0, 'IN FLIGHT should be present');
    assert.ok(onApproachIndex >= 0, 'ON APPROACH should be present');
    assert.ok(taxiingIndex >= 0, 'TAXIING should be present');
    assert.ok(landedIndex >= 0, 'LANDED should be present');

    // In fleet dashboard, the example rows should appear in sort order:
    // FAULT first, then IN FLIGHT, then ON APPROACH, then TAXIING, then LANDED
    // We check fleet dashboard section specifically by looking at the sort rule text
    assert.ok(
      result.includes('FAULT first, then IN FLIGHT, then ON APPROACH, then TAXIING, then LANDED'),
      'Sort order rule should list: FAULT first, then IN FLIGHT, then ON APPROACH, then TAXIING, then LANDED'
    );
  });
});

// ===========================================================================
// CLAUDE.md disable preamble
// ===========================================================================

describe('visual-vocabulary disable preamble', () => {
  it('should document the CLAUDE.md disable mechanism', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('disable ASCII art'),
      'Should document the disable mechanism'
    );
  });
});

// ===========================================================================
// ASCII art constraint documentation
// ===========================================================================

describe('visual-vocabulary ASCII art constraint', () => {
  it('should document the single-line rendering constraint', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('one direction'),
      'Should document horizontal-only rendering'
    );
  });
});

// ===========================================================================
// Context-specific card templates
// ===========================================================================

describe('visual-vocabulary takeoff context', () => {
  it('should include preflight card template', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      /[Pp]reflight/i.test(result),
      'takeoff context should include preflight card'
    );
  });

  it('should include gate panel template', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      /[Gg]ate/i.test(result),
      'takeoff context should include gate panel'
    );
  });
});

describe('visual-vocabulary ship context', () => {
  it('should include departure card template', () => {
    const result = compileWithContext('ship');
    assert.ok(
      /[Dd]eparture/i.test(result),
      'ship context should include departure card'
    );
  });

  it('should include landing card template', () => {
    const result = compileWithContext('ship');
    assert.ok(
      /[Ll]anding/i.test(result),
      'ship context should include landing card'
    );
  });
});

describe('visual-vocabulary status-worktrees context', () => {
  it('should include fleet dashboard template', () => {
    const result = compileWithContext('status-worktrees');
    assert.ok(
      /[Ff]leet/i.test(result),
      'status-worktrees context should include fleet dashboard'
    );
  });
});

describe('visual-vocabulary squadron context', () => {
  it('should provide gauge states for reuse', () => {
    const result = compileWithContext('squadron');
    assert.ok(
      result.includes('LANDED'),
      'squadron context should provide gauge states'
    );
  });

  it('should NOT duplicate squadron visual vocabulary elements', () => {
    const result = compileWithContext('squadron');
    // Squadron's own visual vocabulary includes mission cards, scorecards,
    // tension diagrams, etc. The partial should NOT include these.
    assert.ok(
      !result.includes('Five Keys Scorecard'),
      'squadron context should not duplicate Five Keys Scorecard'
    );
    assert.ok(
      !result.includes('TENSION:'),
      'squadron context should not duplicate tension diagrams'
    );
  });
});

describe('visual-vocabulary functional context', () => {
  it('should provide plain text status labels', () => {
    const result = compileWithContext('functional');
    assert.ok(
      result.includes('LANDED'),
      'functional context should provide status labels'
    );
  });

  it('should NOT include box-drawing characters', () => {
    const result = compileWithContext('functional');
    const boxChars = ['┌', '┐', '└', '┘', '├', '┤', '│', '─', '━'];
    for (const char of boxChars) {
      assert.ok(
        !result.includes(char),
        `functional context should not contain box-drawing character: ${char}`
      );
    }
  });

  it('should NOT include gauge bars', () => {
    const result = compileWithContext('functional');
    assert.ok(
      !result.includes('██'),
      'functional context should not contain gauge bar blocks'
    );
    assert.ok(
      !result.includes('░░'),
      'functional context should not contain gauge bar empty blocks'
    );
  });
});

// ===========================================================================
// Context isolation — each context should NOT include other contexts' cards
// ===========================================================================

describe('visual-vocabulary context isolation', () => {
  it('takeoff should not include ship-specific cards', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      !/[Dd]eparture [Cc]ard/i.test(result),
      'takeoff should not include departure card'
    );
  });

  it('ship should not include takeoff-specific cards', () => {
    const result = compileWithContext('ship');
    assert.ok(
      !/[Pp]reflight [Cc]ard/i.test(result),
      'ship should not include preflight card'
    );
  });

  it('functional should not include any card templates', () => {
    const result = compileWithContext('functional');
    assert.ok(
      !/[Pp]reflight [Cc]ard/i.test(result),
      'functional should not include preflight card'
    );
    assert.ok(
      !/[Dd]eparture [Cc]ard/i.test(result),
      'functional should not include departure card'
    );
    assert.ok(
      !/[Ff]leet [Dd]ashboard/i.test(result),
      'functional should not include fleet dashboard'
    );
  });
});

// ===========================================================================
// Quality Gate Statuses — present in every context
// ===========================================================================

describe('visual-vocabulary quality gate statuses', () => {
  const GATE_STATUSES = ['PASS', 'FAIL', 'RUNNING', 'PENDING', 'SKIP'];

  for (const context of VALID_CONTEXTS) {
    it(`should include all five gate statuses for context: ${context}`, () => {
      const result = compileWithContext(context);
      for (const status of GATE_STATUSES) {
        assert.ok(
          result.includes(status),
          `Missing gate status ${status} in ${context}`
        );
      }
    });
  }

  it('should include documentation note distinguishing gate statuses from gauge states', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('inspection verdicts'),
      'Should document that gate statuses are inspection verdicts'
    );
  });

  it('should include gate status meanings in non-functional contexts', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('gate passed all checks'),
      'PASS meaning should be present'
    );
    assert.ok(
      result.includes('gate found blocking issues'),
      'FAIL meaning should be present'
    );
    assert.ok(
      result.includes('gate currently executing'),
      'RUNNING meaning should be present'
    );
    assert.ok(
      result.includes('gate not yet started'),
      'PENDING meaning should be present'
    );
    assert.ok(
      result.includes('gate not applicable'),
      'SKIP meaning should be present'
    );
  });

  it('should use plain text for gate statuses in functional context', () => {
    const result = compileWithContext('functional');
    for (const status of GATE_STATUSES) {
      assert.ok(
        result.includes(status),
        `functional context missing gate status ${status}`
      );
    }
    // Functional context should not have gauge bars in gate status section
    // (already covered by the existing "no gauge bars" test, but explicit here)
  });
});
