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
  'start',
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
    it(`should include all four gauge states for context: ${context}`, () => {
      const result = compileWithContext(context);
      assert.ok(result.includes('LANDED'), `Missing LANDED state in ${context}`);
      assert.ok(
        result.includes('IN FLIGHT'),
        `Missing IN FLIGHT state in ${context}`
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

describe('visual-vocabulary start context', () => {
  it('should include runway card template', () => {
    const result = compileWithContext('start');
    assert.ok(
      /[Rr]unway [Cc]ard/i.test(result),
      'start context should include runway card'
    );
  });

  it('should include input analysis card template', () => {
    const result = compileWithContext('start');
    assert.ok(
      /[Ii]nput [Aa]nalysis [Cc]ard/i.test(result),
      'start context should include input analysis card'
    );
  });

  it('should include all three workflow entrypoints', () => {
    const result = compileWithContext('start');
    assert.ok(result.includes('SQUADRON'), 'should reference SQUADRON');
    assert.ok(result.includes('FLIGHT-PLAN'), 'should reference FLIGHT-PLAN');
    assert.ok(result.includes('TAKEOFF'), 'should reference TAKEOFF');
  });

  it('should include command syntax for each entrypoint', () => {
    const result = compileWithContext('start');
    assert.ok(
      result.includes('/reaper:squadron'),
      'should include squadron command syntax'
    );
    assert.ok(
      result.includes('/reaper:flight-plan'),
      'should include flight-plan command syntax'
    );
    assert.ok(
      result.includes('/reaper:takeoff'),
      'should include takeoff command syntax'
    );
  });

  it('should include workflow progression arrows', () => {
    const result = compileWithContext('start');
    assert.ok(
      result.includes('feeds into'),
      'should show workflow progression between entrypoints'
    );
  });

  it('should include KEY ELEMENTS section in input analysis card', () => {
    const result = compileWithContext('start');
    assert.ok(
      result.includes('KEY ELEMENTS'),
      'input analysis card should have KEY ELEMENTS section'
    );
  });

  it('should include ROUTING FACTORS section in input analysis card', () => {
    const result = compileWithContext('start');
    assert.ok(
      result.includes('ROUTING FACTORS'),
      'input analysis card should have ROUTING FACTORS section'
    );
  });

  it('should NOT include gauge states in card templates', () => {
    const result = compileWithContext('start');
    // start context gets gauge states from the shared section above,
    // but the card templates themselves should NOT contain gauge bars
    const cardSection = result.split('Runway Card')[1] || '';
    assert.ok(
      !cardSection.includes('TAXIING'),
      'start card templates should not contain gauge state TAXIING'
    );
    assert.ok(
      !cardSection.includes('IN FLIGHT'),
      'start card templates should not contain gauge state IN FLIGHT'
    );
  });

  it('should include REAPER branded header', () => {
    const result = compileWithContext('start');
    // The card template should show a REAPER header with heavy rule
    assert.ok(
      result.includes('REAPER'),
      'start context should include REAPER branded header'
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

  it('start should not include other contexts card templates', () => {
    const result = compileWithContext('start');
    assert.ok(
      !/[Pp]reflight [Cc]ard/i.test(result),
      'start should not include preflight card'
    );
    assert.ok(
      !/[Dd]eparture [Cc]ard/i.test(result),
      'start should not include departure card'
    );
    assert.ok(
      !/[Ff]leet [Dd]ashboard/i.test(result),
      'start should not include fleet dashboard'
    );
  });

  it('takeoff should not include start-specific cards', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      !/[Rr]unway [Cc]ard/i.test(result),
      'takeoff should not include runway card'
    );
    assert.ok(
      !/[Ii]nput [Aa]nalysis [Cc]ard/i.test(result),
      'takeoff should not include input analysis card'
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
    assert.ok(
      !/[Rr]unway [Cc]ard/i.test(result),
      'functional should not include runway card'
    );
    assert.ok(
      !/[Ii]nput [Aa]nalysis [Cc]ard/i.test(result),
      'functional should not include input analysis card'
    );
  });
});
