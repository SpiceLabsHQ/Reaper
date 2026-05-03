'use strict';

/**
 * @fileoverview Tests for src/skills/issue-tracker-linear/SKILL.ejs
 *
 * Validates the source template (pre-build) for:
 *   - Frontmatter completeness (name, description, user-invocable, allowed-tools)
 *   - Safe MCP tool inclusion in allowed-tools
 *   - CRM tool exclusion from allowed-tools
 *   - All 7 abstract operations present
 *   - Required sections present (Quick Reference, Hierarchy, Dependency, Pagination, Safe Tools)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(
  ROOT,
  'src',
  'skills',
  'issue-tracker-linear',
  'SKILL.ejs'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the raw YAML frontmatter block from file content.
 * Returns null when no frontmatter delimiters are found.
 * @param {string} content - Full file content
 * @returns {string|null}
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Checks whether a YAML frontmatter block contains a given field name.
 * @param {string} frontmatter - Raw frontmatter text
 * @param {string} field - Field name (e.g. "name")
 * @returns {boolean}
 */
function frontmatterHasField(frontmatter, field) {
  const regex = new RegExp(`^${field}\\s*:`, 'm');
  return regex.test(frontmatter);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Safe MCP tools that MUST appear in allowed-tools.
 */
const SAFE_TOOLS = [
  'mcp__linear-server__get_issue',
  'mcp__linear-server__list_issues',
  'mcp__linear-server__save_issue',
  'mcp__linear-server__list_comments',
  'mcp__linear-server__save_comment',
  'mcp__linear-server__delete_comment',
  'mcp__linear-server__list_teams',
  'mcp__linear-server__get_team',
  'mcp__linear-server__list_users',
  'mcp__linear-server__get_user',
  'mcp__linear-server__list_projects',
  'mcp__linear-server__get_project',
  'mcp__linear-server__save_project',
  'mcp__linear-server__list_milestones',
  'mcp__linear-server__get_milestone',
  'mcp__linear-server__save_milestone',
  'mcp__linear-server__list_cycles',
  'mcp__linear-server__list_issue_statuses',
  'mcp__linear-server__get_issue_status',
  'mcp__linear-server__list_issue_labels',
  'mcp__linear-server__create_issue_label',
  'mcp__linear-server__list_project_labels',
  'mcp__linear-server__list_documents',
  'mcp__linear-server__get_document',
  'mcp__linear-server__save_document',
  'mcp__linear-server__list_initiatives',
  'mcp__linear-server__get_initiative',
  'mcp__linear-server__save_initiative',
  'mcp__linear-server__search_documentation',
  'mcp__linear-server__create_attachment',
  'mcp__linear-server__get_attachment',
  'mcp__linear-server__delete_attachment',
];

/**
 * CRM tools that must NOT appear in allowed-tools.
 */
const CRM_TOOLS_EXCLUDED = [
  'mcp__linear-server__save_customer',
  'mcp__linear-server__delete_customer',
  'mcp__linear-server__save_customer_need',
  'mcp__linear-server__delete_customer_need',
  'mcp__linear-server__delete_status_update',
  'mcp__linear-server__save_status_update',
  'mcp__linear-server__get_status_updates',
  'mcp__linear-server__extract_images',
  'mcp__linear-server__list_customers',
];

/**
 * The 7 abstract operations every issue-tracker skill must implement.
 */
const ABSTRACT_OPERATIONS = [
  'FETCH_ISSUE',
  'LIST_CHILDREN',
  'CREATE_ISSUE',
  'UPDATE_ISSUE',
  'ADD_DEPENDENCY',
  'QUERY_DEPENDENCY_TREE',
  'CLOSE_ISSUE',
];

/**
 * Required section headings that must appear in the skill body.
 */
const REQUIRED_SECTIONS = [
  'Quick Reference',
  'Hierarchy Pattern',
  'Dependency',
  'Pagination',
  'Safe Tool',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('src/skills/issue-tracker-linear/SKILL.ejs', () => {
  it('file exists', () => {
    assert.ok(
      fs.existsSync(SOURCE_FILE),
      `SKILL.ejs not found at ${SOURCE_FILE}`
    );
  });

  describe('frontmatter', () => {
    it('has valid YAML frontmatter delimiters', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(
        fm !== null,
        'SKILL.ejs is missing YAML frontmatter (--- delimiters)'
      );
    });

    it('frontmatter contains "name" field', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
      assert.ok(
        frontmatterHasField(fm, 'name'),
        'frontmatter is missing required "name" field'
      );
    });

    it('frontmatter name is "issue-tracker-linear"', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
      assert.match(
        fm,
        /^name:\s*issue-tracker-linear\s*$/m,
        'name must be "issue-tracker-linear"'
      );
    });

    it('frontmatter contains "description" field', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
      assert.ok(
        frontmatterHasField(fm, 'description'),
        'frontmatter is missing required "description" field'
      );
    });

    it('frontmatter contains "user-invocable: false"', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
      assert.match(
        fm,
        /^user-invocable:\s*false\s*$/m,
        'user-invocable must be false'
      );
    });

    it('frontmatter contains "allowed-tools" field', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
      assert.ok(
        frontmatterHasField(fm, 'allowed-tools'),
        'frontmatter is missing required "allowed-tools" field'
      );
    });
  });

  describe('allowed-tools: safe MCP tools included', () => {
    for (const tool of SAFE_TOOLS) {
      it(`allowed-tools includes ${tool}`, () => {
        const content = fs.readFileSync(SOURCE_FILE, 'utf8');
        const fm = extractFrontmatter(content);
        assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
        assert.ok(
          fm.includes(tool),
          `allowed-tools is missing safe tool "${tool}"`
        );
      });
    }
  });

  describe('allowed-tools: CRM tools excluded', () => {
    for (const tool of CRM_TOOLS_EXCLUDED) {
      it(`allowed-tools excludes ${tool}`, () => {
        const content = fs.readFileSync(SOURCE_FILE, 'utf8');
        const fm = extractFrontmatter(content);
        assert.ok(fm !== null, 'SKILL.ejs is missing frontmatter');
        assert.ok(
          !fm.includes(tool),
          `allowed-tools must NOT include CRM tool "${tool}"`
        );
      });
    }
  });

  describe('abstract operations completeness', () => {
    for (const operation of ABSTRACT_OPERATIONS) {
      it(`body contains operation ${operation}`, () => {
        const content = fs.readFileSync(SOURCE_FILE, 'utf8');
        assert.ok(
          content.includes(operation),
          `SKILL.ejs is missing abstract operation "${operation}"`
        );
      });
    }
  });

  describe('Quick Reference table', () => {
    it('Quick Reference table contains all 7 operations', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      // Find the Quick Reference section
      const qrMatch = content.match(
        /##\s+Quick Reference[\s\S]*?(?=\n##\s|\n---\s|$)/
      );
      assert.ok(qrMatch, 'Quick Reference section not found');
      const qrSection = qrMatch[0];
      for (const op of ABSTRACT_OPERATIONS) {
        assert.ok(
          qrSection.includes(op),
          `Quick Reference table is missing operation "${op}"`
        );
      }
    });

    it('Quick Reference table references mcp__linear-server__get_issue for FETCH_ISSUE', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const qrMatch = content.match(
        /##\s+Quick Reference[\s\S]*?(?=\n##\s|\n---\s|$)/
      );
      assert.ok(qrMatch, 'Quick Reference section not found');
      assert.ok(
        qrMatch[0].includes('mcp__linear-server__get_issue'),
        'Quick Reference FETCH_ISSUE row must reference mcp__linear-server__get_issue'
      );
    });

    it('Quick Reference table references mcp__linear-server__save_issue for CREATE_ISSUE', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const qrMatch = content.match(
        /##\s+Quick Reference[\s\S]*?(?=\n##\s|\n---\s|$)/
      );
      assert.ok(qrMatch, 'Quick Reference section not found');
      assert.ok(
        qrMatch[0].includes('mcp__linear-server__save_issue'),
        'Quick Reference must reference mcp__linear-server__save_issue'
      );
    });

    it('Quick Reference table references mcp__linear-server__list_issues for LIST_CHILDREN', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      const qrMatch = content.match(
        /##\s+Quick Reference[\s\S]*?(?=\n##\s|\n---\s|$)/
      );
      assert.ok(qrMatch, 'Quick Reference section not found');
      assert.ok(
        qrMatch[0].includes('mcp__linear-server__list_issues'),
        'Quick Reference must reference mcp__linear-server__list_issues'
      );
    });
  });

  describe('required sections', () => {
    for (const section of REQUIRED_SECTIONS) {
      it(`body contains section matching "${section}"`, () => {
        const content = fs.readFileSync(SOURCE_FILE, 'utf8');
        assert.ok(
          content.includes(section),
          `SKILL.ejs is missing required section "${section}"`
        );
      });
    }
  });

  describe('Hierarchy Pattern section', () => {
    it('documents parentId as the hierarchy mechanism', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('parentId'),
        'Hierarchy Pattern must document parentId as the mechanism for parent-child relationships'
      );
    });

    it('warns against using ADD_DEPENDENCY for hierarchy', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      // Should mention parentId in context of hierarchy creation
      assert.ok(
        content.includes('parentId'),
        'SKILL.ejs must document parentId for hierarchy (not ADD_DEPENDENCY)'
      );
    });
  });

  describe('Dependency/Relation Pattern section', () => {
    it('documents "blocks" relation type', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('blocks'),
        'Dependency section must document "blocks" relation type'
      );
    });

    it('documents "blockedBy" relation type', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('blockedBy'),
        'Dependency section must document "blockedBy" relation type'
      );
    });

    it('documents "relatedTo" relation type', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('relatedTo'),
        'Dependency section must document "relatedTo" relation type'
      );
    });

    it('documents includeRelations flag for QUERY_DEPENDENCY_TREE', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('includeRelations'),
        'SKILL.ejs must document includeRelations: true for QUERY_DEPENDENCY_TREE'
      );
    });
  });

  describe('Pagination Pattern section', () => {
    it('documents cursor-based pagination', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('cursor'),
        'Pagination section must document cursor-based iteration'
      );
    });

    it('documents limit parameter', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('limit'),
        'Pagination section must document limit parameter'
      );
    });
  });

  describe('Repo Context section', () => {
    it('has a Repo Context section', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('Repo Context'),
        'SKILL.ejs must have a Repo Context section'
      );
    });
  });

  describe('Safe Tool Listing section', () => {
    it('lists mcp__linear-server__get_issue with description', () => {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      assert.ok(
        content.includes('mcp__linear-server__get_issue'),
        'Safe Tool Listing must include mcp__linear-server__get_issue'
      );
    });
  });
});
