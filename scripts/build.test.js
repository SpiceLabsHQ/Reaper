const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  GATE_CAPABLE_AGENTS,
  buildTemplateVars,
  parseFrontmatter,
  AGENT_TYPES,
} = require('./build');
const { resetBuildState } = require('./test-helpers');

beforeEach(() => {
  resetBuildState();
});

describe('GATE_CAPABLE_AGENTS', () => {
  it('should be exported as an array', () => {
    assert.ok(
      Array.isArray(GATE_CAPABLE_AGENTS),
      'GATE_CAPABLE_AGENTS should be an array'
    );
  });

  it('should contain the expected gate-capable agents', () => {
    const expected = [
      'ai-prompt-engineer',
      'code-reviewer',
      'security-auditor',
      'deployment-engineer',
    ];
    assert.deepStrictEqual(
      GATE_CAPABLE_AGENTS.slice().sort(),
      expected.slice().sort(),
      'GATE_CAPABLE_AGENTS should contain exactly the four gate-capable agents'
    );
  });

  it('should only contain agents that exist in AGENT_TYPES', () => {
    const allAgents = Object.values(AGENT_TYPES).flat();
    for (const agent of GATE_CAPABLE_AGENTS) {
      assert.ok(
        allAgents.includes(agent),
        `Gate-capable agent "${agent}" should exist in AGENT_TYPES`
      );
    }
  });
});

describe('buildTemplateVars gateCapable', () => {
  it('should set gateCapable to true for gate-capable agents', () => {
    const gateAgents = [
      'ai-prompt-engineer',
      'code-reviewer',
      'security-auditor',
      'deployment-engineer',
    ];

    for (const agent of gateAgents) {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.gateCapable,
        true,
        `Agent "${agent}" should have gateCapable: true`
      );
    }
  });

  it('should set gateCapable to false for non-gate-capable agents', () => {
    const nonGateAgents = [
      'bug-fixer',
      'feature-developer',
      'refactoring-dev',
      'workflow-planner',
      'test-runner',
      'branch-manager',
    ];

    for (const agent of nonGateAgents) {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.gateCapable,
        false,
        `Agent "${agent}" should have gateCapable: false`
      );
    }
  });

  it('should not set gateCapable for non-agent source types', () => {
    const vars = buildTemplateVars('skills', 'some-skill', 'skills/some-skill.ejs');
    assert.strictEqual(
      vars.gateCapable,
      undefined,
      'Skills should not have gateCapable property'
    );
  });

  it('should not set gateCapable for hooks source type', () => {
    const vars = buildTemplateVars('hooks', 'some-hook', 'hooks/some-hook.ejs');
    assert.strictEqual(
      vars.gateCapable,
      undefined,
      'Hooks should not have gateCapable property'
    );
  });
});

describe('parseFrontmatter', () => {
  describe('standard frontmatter', () => {
    it('should parse basic frontmatter with key-value pairs', () => {
      const content = '---\ntitle: Hello\ndescription: World\n---\nBody content here';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Hello\ndescription: World\n---\n',
        'frontmatter should include delimiters and trailing newline'
      );
      assert.strictEqual(
        result.body,
        'Body content here',
        'body should contain everything after the frontmatter block'
      );
    });

    it('should preserve the full frontmatter block including delimiters', () => {
      const content = '---\nkey: value\n---\n';
      const result = parseFrontmatter(content);

      assert.ok(
        result.frontmatter.startsWith('---'),
        'frontmatter should start with opening ---'
      );
      assert.ok(
        result.frontmatter.includes('key: value'),
        'frontmatter should contain the YAML content'
      );
    });

    it('should handle single key-value frontmatter', () => {
      const content = '---\ntitle: Test\n---\nBody';
      const result = parseFrontmatter(content);

      assert.strictEqual(result.frontmatter, '---\ntitle: Test\n---\n');
      assert.strictEqual(result.body, 'Body');
    });
  });

  describe('CRLF line endings', () => {
    it('should parse frontmatter with CRLF line endings', () => {
      const content = '---\r\ntitle: Hello\r\n---\r\nBody content';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\r\ntitle: Hello\r\n---\r\n',
        'frontmatter should preserve CRLF line endings'
      );
      assert.strictEqual(result.body, 'Body content');
    });

    it('should handle mixed line endings (LF in frontmatter, CRLF at delimiters)', () => {
      // The regex allows \r?\n at each delimiter boundary independently
      const content = '---\r\ntitle: Hello\r\n---\nBody content';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(
        result.frontmatter,
        null,
        'should match frontmatter with mixed line endings at delimiters'
      );
      assert.strictEqual(result.body, 'Body content');
    });
  });

  describe('missing trailing newline after closing ---', () => {
    it('should parse frontmatter when content ends immediately after closing ---', () => {
      const content = '---\ntitle: Test\n---';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Test\n---',
        'frontmatter should match even without trailing newline'
      );
      assert.strictEqual(
        result.body,
        '',
        'body should be empty when nothing follows closing ---'
      );
    });

    it('should parse frontmatter when body follows closing --- without newline', () => {
      // The regex \r?\n? means the trailing newline is optional
      // But the body starts right after the matched portion
      const content = '---\ntitle: Test\n---Body directly after';
      const result = parseFrontmatter(content);

      // The regex \r?\n? at the end is optional, so --- without newline still matches
      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Test\n---',
        'frontmatter should match without trailing newline before body'
      );
      assert.strictEqual(
        result.body,
        'Body directly after',
        'body should start immediately after closing ---'
      );
    });
  });

  describe('empty frontmatter', () => {
    it('should parse frontmatter with blank line between delimiters', () => {
      // ---\n\n---\n means empty YAML content (just a blank line)
      const content = '---\n\n---\nBody';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(
        result.frontmatter,
        null,
        'should match frontmatter with blank line between delimiters'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should not match when delimiters are immediately adjacent with only one newline', () => {
      // ---\n--- has no \n before closing --- (the regex requires \r?\n before closing ---)
      // After ^---\n, the remaining is ---\nbody. The non-greedy capture cannot
      // satisfy the \r?\n---\r?\n? requirement without consuming past the closing ---.
      const content = '---\n---\nBody';
      const result = parseFrontmatter(content);

      // The regex requires content + \n before closing ---,
      // so ---\n---\n does not match as "empty" frontmatter
      assert.strictEqual(
        result.frontmatter,
        null,
        'adjacent delimiters with single newline should not match'
      );
      assert.strictEqual(
        result.body,
        '---\n---\nBody',
        'entire content should be returned as body'
      );
    });
  });

  describe('no frontmatter', () => {
    it('should return null frontmatter for plain text content', () => {
      const content = 'Just some body content without any frontmatter';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'frontmatter should be null for plain content'
      );
      assert.strictEqual(
        result.body,
        content,
        'body should be the entire content'
      );
    });

    it('should return null frontmatter for empty string', () => {
      const result = parseFrontmatter('');

      assert.strictEqual(result.frontmatter, null);
      assert.strictEqual(result.body, '');
    });

    it('should return null frontmatter when content starts with text', () => {
      const content = 'Hello world\n---\ntitle: Fake\n---\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'frontmatter must be anchored to start of content'
      );
      assert.strictEqual(result.body, content);
    });

    it('should return null frontmatter for content starting with dashes but not exactly ---', () => {
      const content = '----\ntitle: Test\n----\nBody';
      const result = parseFrontmatter(content);

      // ^--- would match the first three dashes of ----, but then \r?\n
      // expects a newline immediately after the third dash. The fourth dash
      // is not a newline, so the regex does not match.
      assert.strictEqual(
        result.frontmatter,
        null,
        'four dashes should not match as frontmatter opening'
      );
    });
  });

  describe('frontmatter-like patterns inside template body', () => {
    it('should not treat --- in body as frontmatter when valid frontmatter exists', () => {
      const content = '---\ntitle: Real\n---\nBody with\n---\nfake: frontmatter\n---\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Real\n---\n',
        'should only match the first frontmatter block'
      );
      assert.strictEqual(
        result.body,
        'Body with\n---\nfake: frontmatter\n---\n',
        'body should contain remaining content including --- patterns'
      );
    });

    it('should not treat --- in body as frontmatter when no valid frontmatter exists', () => {
      const content = 'Some content\n---\ntitle: value\n---\nMore content';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'regex anchors to start so mid-content --- is not frontmatter'
      );
      assert.strictEqual(result.body, content);
    });
  });

  describe('multiple --- delimiters in content', () => {
    it('should use non-greedy matching to capture first valid block', () => {
      const content = '---\nfirst: block\n---\n---\nsecond: block\n---\nBody';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\nfirst: block\n---\n',
        'should match only the first frontmatter block (non-greedy)'
      );
      assert.strictEqual(
        result.body,
        '---\nsecond: block\n---\nBody',
        'body should contain remaining content including second block'
      );
    });

    it('should handle horizontal rules in markdown body', () => {
      const content = '---\ntitle: Post\n---\n\n## Heading\n\n---\n\nMore content\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Post\n---\n',
        'should parse frontmatter correctly'
      );
      assert.ok(
        result.body.includes('---'),
        'body should preserve markdown horizontal rules'
      );
    });
  });

  describe('content with only opening --- (no closing)', () => {
    it('should return null when only opening --- exists', () => {
      const content = '---\ntitle: Unclosed\nno closing delimiter here';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'unclosed frontmatter should not match'
      );
      assert.strictEqual(result.body, content);
    });

    it('should return null when closing --- lacks preceding newline', () => {
      // The regex requires \r?\n before the closing ---
      const content = '---\ntitle: Test---\nBody';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'closing --- must be preceded by a newline'
      );
      assert.strictEqual(result.body, content);
    });
  });

  describe('content with --- inside code blocks', () => {
    it('should parse valid frontmatter even when body contains fenced code with ---', () => {
      const content =
        '---\ntitle: Guide\n---\n```yaml\n---\ncode_key: value\n---\n```\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Guide\n---\n',
        'should correctly parse frontmatter before code block'
      );
      assert.ok(
        result.body.includes('```yaml'),
        'body should contain the full code block'
      );
      assert.ok(
        result.body.includes('code_key: value'),
        'body should preserve code block content'
      );
    });

    it('should treat entire content as body when --- only appears in code block', () => {
      const content = '# Title\n\n```\n---\nkey: value\n---\n```\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        '--- inside code block should not be treated as frontmatter'
      );
      assert.strictEqual(result.body, content);
    });
  });

  describe('whitespace variations around delimiters', () => {
    it('should not match when opening --- has leading spaces', () => {
      const content = '  ---\ntitle: Test\n---\nBody';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'leading spaces before opening --- should prevent matching'
      );
    });

    it('should not match when opening --- has a leading tab', () => {
      const content = '\t---\ntitle: Test\n---\nBody';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'leading tab before opening --- should prevent matching'
      );
    });

    it('should handle trailing spaces after closing ---', () => {
      // Trailing spaces on closing --- line: ---   \n
      // The regex is \r?\n---\r?\n? so the spaces after --- would be consumed
      // by... actually they wouldn't. \r?\n---\r?\n? matches \n--- then \r?\n?.
      // Trailing spaces after --- would mean the \r?\n? sees spaces, not \n.
      // So \r?\n? matches zero (optional), and match[0] ends at ---.
      // The trailing spaces become part of the body.
      const content = '---\ntitle: Test\n---   \nBody';
      const result = parseFrontmatter(content);

      // The regex matches \n--- and then \r?\n? tries to match the space -- it can't,
      // so \n? matches zero. match[0] = '---\ntitle: Test\n---'
      assert.notStrictEqual(
        result.frontmatter,
        null,
        'trailing spaces after closing --- should still allow a match'
      );
      assert.ok(
        result.body.includes('Body'),
        'body should contain the content after frontmatter'
      );
    });

    it('should handle content with only whitespace in frontmatter', () => {
      const content = '---\n   \n---\nBody';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(
        result.frontmatter,
        null,
        'whitespace-only frontmatter should match'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle newline-only content before closing delimiter', () => {
      const content = '---\n\n\n---\nBody';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(
        result.frontmatter,
        null,
        'multiple blank lines as frontmatter content should match'
      );
      assert.strictEqual(result.body, 'Body');
    });
  });

  describe('frontmatter with complex YAML', () => {
    it('should handle multi-line string values', () => {
      const yaml = 'description: |\n  This is a multi-line\n  string value';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.ok(
        result.frontmatter.includes('multi-line'),
        'frontmatter should contain the multi-line string'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle YAML arrays', () => {
      const yaml = 'tags:\n  - javascript\n  - testing\n  - tdd';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.ok(
        result.frontmatter.includes('- javascript'),
        'frontmatter should preserve array items'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle nested YAML objects', () => {
      const yaml = 'author:\n  name: John\n  email: john@example.com';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.ok(
        result.frontmatter.includes('name: John'),
        'frontmatter should preserve nested object keys'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle YAML with special characters', () => {
      const yaml = 'title: "Hello: World"\npath: /foo/bar\nregex: "^---$"';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.ok(
        result.frontmatter.includes('"Hello: World"'),
        'frontmatter should preserve special characters in values'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle YAML with boolean and numeric values', () => {
      const yaml = 'published: true\nversion: 2.5\ncount: 42';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.ok(
        result.frontmatter.includes('published: true'),
        'frontmatter should preserve boolean values'
      );
      assert.strictEqual(result.body, 'Body');
    });

    it('should handle large frontmatter blocks', () => {
      const lines = [];
      for (let i = 0; i < 50; i++) {
        lines.push(`key${i}: value${i}`);
      }
      const yaml = lines.join('\n');
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.notStrictEqual(
        result.frontmatter,
        null,
        'large frontmatter blocks should be parsed correctly'
      );
      assert.ok(
        result.frontmatter.includes('key49: value49'),
        'should capture all frontmatter lines'
      );
      assert.strictEqual(result.body, 'Body');
    });
  });

  describe('return value structure', () => {
    it('should always return an object with frontmatter and body keys', () => {
      const withFm = parseFrontmatter('---\nk: v\n---\nbody');
      assert.ok('frontmatter' in withFm, 'result should have frontmatter key');
      assert.ok('body' in withFm, 'result should have body key');

      const withoutFm = parseFrontmatter('no frontmatter');
      assert.ok('frontmatter' in withoutFm, 'result should have frontmatter key');
      assert.ok('body' in withoutFm, 'result should have body key');
    });

    it('should return string type for frontmatter when present', () => {
      const result = parseFrontmatter('---\nk: v\n---\nbody');
      assert.strictEqual(typeof result.frontmatter, 'string');
    });

    it('should return null for frontmatter when absent', () => {
      const result = parseFrontmatter('no frontmatter');
      assert.strictEqual(result.frontmatter, null);
    });

    it('should return string type for body in all cases', () => {
      const withFm = parseFrontmatter('---\nk: v\n---\nbody');
      assert.strictEqual(typeof withFm.body, 'string');

      const withoutFm = parseFrontmatter('no frontmatter');
      assert.strictEqual(typeof withoutFm.body, 'string');
    });
  });

  describe('body content preservation', () => {
    it('should preserve body content exactly after frontmatter', () => {
      const body = '# Title\n\nParagraph with **bold** and _italic_.\n\n- List item\n';
      const content = `---\ntitle: Test\n---\n${body}`;
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.body,
        body,
        'body content should be preserved exactly'
      );
    });

    it('should handle body with special regex characters', () => {
      const body = 'Content with (parens), [brackets], {braces}, $dollars, and ^carets\n';
      const content = `---\ntitle: Test\n---\n${body}`;
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.body,
        body,
        'body with regex special characters should be preserved'
      );
    });

    it('should handle empty body after frontmatter with trailing newline', () => {
      const content = '---\ntitle: Test\n---\n';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.strictEqual(
        result.body,
        '',
        'body should be empty when nothing follows frontmatter'
      );
    });
  });
});
