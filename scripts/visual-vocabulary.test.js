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
    it(`should include all six gauge states for context: ${context}`, () => {
      const result = compileWithContext(context);
      assert.ok(result.includes('LANDED'), `Missing LANDED state in ${context}`);
      assert.ok(
        result.includes('IN FLIGHT'),
        `Missing IN FLIGHT state in ${context}`
      );
      assert.ok(
        result.includes('TAKING OFF'),
        `Missing TAKING OFF state in ${context}`
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
  it('should describe six semantic states (not five or four)', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('Six semantic states'),
      'Introductory text should say "Six semantic states"'
    );
    assert.ok(
      !result.includes('Five semantic states'),
      'Should no longer say "Five semantic states"'
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
// TAKING OFF gauge state specifics
// ===========================================================================

describe('visual-vocabulary TAKING OFF gauge details', () => {
  it('should show TAKING OFF gauge bar (3 filled, 7 empty) in non-functional contexts', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('███░░░░░░░'),
      'TAKING OFF gauge bar should be 3 filled + 7 empty blocks'
    );
  });

  it('should include TAKING OFF gloss in non-functional contexts', () => {
    const result = compileWithContext('takeoff');
    // The gloss should describe pre-execution state
    assert.ok(
      result.includes('TAKING OFF'),
      'TAKING OFF label should be present'
    );
    // Find the line with TAKING OFF and verify it has a gloss
    const lines = result.split('\n');
    const takingOffLine = lines.find(
      (l) => l.includes('TAKING OFF') && l.includes('███░░░░░░░')
    );
    assert.ok(
      takingOffLine,
      'Should have a line with both TAKING OFF label and gauge bar'
    );
  });

  it('should place TAKING OFF between IN FLIGHT and TAXIING in gauge definitions', () => {
    const result = compileWithContext('takeoff');
    const inFlightIndex = result.indexOf('IN FLIGHT');
    const takingOffIndex = result.indexOf('TAKING OFF');
    const taxiingIndex = result.indexOf('TAXIING');

    assert.ok(inFlightIndex >= 0, 'IN FLIGHT should be present');
    assert.ok(takingOffIndex >= 0, 'TAKING OFF should be present');
    assert.ok(taxiingIndex >= 0, 'TAXIING should be present');

    assert.ok(
      inFlightIndex < takingOffIndex,
      'IN FLIGHT should appear before TAKING OFF in gauge definitions'
    );
    assert.ok(
      takingOffIndex < taxiingIndex,
      'TAKING OFF should appear before TAXIING in gauge definitions'
    );
  });

  it('should show plain-text TAKING OFF label in functional context', () => {
    const result = compileWithContext('functional');
    assert.ok(
      result.includes('TAKING OFF'),
      'functional context should include TAKING OFF label'
    );
  });

  it('should place TAKING OFF between IN FLIGHT and TAXIING in functional context', () => {
    const result = compileWithContext('functional');
    const inFlightIndex = result.indexOf('IN FLIGHT');
    const takingOffIndex = result.indexOf('TAKING OFF');
    const taxiingIndex = result.indexOf('TAXIING');

    assert.ok(inFlightIndex >= 0, 'IN FLIGHT should be present in functional');
    assert.ok(takingOffIndex >= 0, 'TAKING OFF should be present in functional');
    assert.ok(taxiingIndex >= 0, 'TAXIING should be present in functional');

    assert.ok(
      inFlightIndex < takingOffIndex,
      'IN FLIGHT should appear before TAKING OFF in functional context'
    );
    assert.ok(
      takingOffIndex < taxiingIndex,
      'TAKING OFF should appear before TAXIING in functional context'
    );
  });

  it('should NOT include gauge bars in functional context TAKING OFF entry', () => {
    const result = compileWithContext('functional');
    assert.ok(
      !result.includes('███░░░░░░░'),
      'functional context should not contain TAKING OFF gauge bar'
    );
  });
});

// ===========================================================================
// Fleet dashboard sort order with ON APPROACH
// ===========================================================================

describe('visual-vocabulary fleet dashboard sort order', () => {
  it('should include TAKING OFF in fleet dashboard sort order between IN FLIGHT and ON APPROACH', () => {
    const result = compileWithContext('status-worktrees');
    const faultIndex = result.indexOf('FAULT');
    const inFlightIndex = result.indexOf('IN FLIGHT');
    const takingOffIndex = result.indexOf('TAKING OFF');
    const onApproachIndex = result.indexOf('ON APPROACH');
    const taxiingIndex = result.indexOf('TAXIING');
    const landedIndex = result.indexOf('LANDED');

    assert.ok(faultIndex >= 0, 'FAULT should be present');
    assert.ok(inFlightIndex >= 0, 'IN FLIGHT should be present');
    assert.ok(takingOffIndex >= 0, 'TAKING OFF should be present');
    assert.ok(onApproachIndex >= 0, 'ON APPROACH should be present');
    assert.ok(taxiingIndex >= 0, 'TAXIING should be present');
    assert.ok(landedIndex >= 0, 'LANDED should be present');

    // In fleet dashboard, the sort rule text should include TAKING OFF
    // Sort: FAULT first, then IN FLIGHT, then TAKING OFF, then ON APPROACH, then TAXIING, then LANDED
    assert.ok(
      result.includes('FAULT first, then IN FLIGHT, then TAKING OFF, then ON APPROACH, then TAXIING, then LANDED'),
      'Sort order rule should list: FAULT first, then IN FLIGHT, then TAKING OFF, then ON APPROACH, then TAXIING, then LANDED'
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
    // Per CLAUDE.md scope boundary: Five Keys must not be imposed on target
    // projects through generated prompts, agent instructions, or command output.
    assert.ok(
      !result.includes('Design Quality Scorecard'),
      'squadron context should not duplicate Design Quality Scorecard'
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

  it('should include REAPER branded header with heavy rule', () => {
    const result = compileWithContext('start');
    // The card template should show a REAPER header with heavy rule
    assert.ok(
      result.includes('REAPER'),
      'start context should include REAPER branded header'
    );
    assert.ok(
      result.includes('━━━'),
      'start context should include heavy rule (━━━) under REAPER header'
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

// ===========================================================================
// Gate Panel uses gate statuses, not gauge states
// ===========================================================================

describe('visual-vocabulary Gate Panel uses gate statuses not gauge states', () => {
  it('should show PASS, RUNNING, PENDING in the Gate Panel example (takeoff)', () => {
    const result = compileWithContext('takeoff');
    // Extract the Gate Panel section (between "GATE RESULTS" and the next ### or end)
    const gatePanelStart = result.indexOf('GATE RESULTS');
    assert.ok(gatePanelStart >= 0, 'Gate Panel should contain GATE RESULTS header');

    const gatePanelEnd = result.indexOf('###', gatePanelStart);
    const gateSection =
      gatePanelEnd > gatePanelStart
        ? result.slice(gatePanelStart, gatePanelEnd)
        : result.slice(gatePanelStart);

    // Gate Panel example should use gate statuses
    assert.ok(
      gateSection.includes('PASS'),
      'Gate Panel example should use PASS gate status'
    );
    assert.ok(
      gateSection.includes('RUNNING'),
      'Gate Panel example should use RUNNING gate status'
    );
    assert.ok(
      gateSection.includes('PENDING'),
      'Gate Panel example should use PENDING gate status'
    );
  });

  it('should NOT use gauge states (LANDED, IN FLIGHT, TAXIING) in the Gate Panel example', () => {
    const result = compileWithContext('takeoff');
    const gatePanelStart = result.indexOf('GATE RESULTS');
    assert.ok(gatePanelStart >= 0, 'Gate Panel should contain GATE RESULTS header');

    const gatePanelEnd = result.indexOf('###', gatePanelStart);
    const gateSection =
      gatePanelEnd > gatePanelStart
        ? result.slice(gatePanelStart, gatePanelEnd)
        : result.slice(gatePanelStart);

    // Gate Panel should NOT contain gauge states as status values
    assert.ok(
      !gateSection.includes('LANDED'),
      'Gate Panel should not use LANDED gauge state'
    );
    assert.ok(
      !gateSection.includes('IN FLIGHT'),
      'Gate Panel should not use IN FLIGHT gauge state'
    );
    assert.ok(
      !gateSection.includes('TAXIING'),
      'Gate Panel should not use TAXIING gauge state'
    );
  });

  it('should document that Gate Panel uses gate statuses not gauge bars', () => {
    const result = compileWithContext('takeoff');
    assert.ok(
      result.includes('No gauge bars in the Gate Panel'),
      'Gate Panel rules should state "No gauge bars in the Gate Panel"'
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
