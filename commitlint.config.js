/**
 * Commitlint configuration with conventional commits + Beads issue reference
 *
 * Requires a "Ref: reaper-xxx" footer in all commits except chores.
 * This ensures all non-chore work is tracked in Beads.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: ['beads-ref'],
  rules: {
    // Require Beads reference for non-chore commits
    'beads-ref': [2, 'always'],
  },
};

/**
 * Custom plugin to validate Beads issue reference in footer
 */
const beadsRefPlugin = {
  rules: {
    'beads-ref': ({ type, raw }) => {
      // Chore commits are exempt
      if (type === 'chore') {
        return [true, 'Chore commits are exempt from Beads reference requirement'];
      }

      // Check for Ref: footer with Beads issue ID pattern (reaper-xxx)
      const refPattern = /^Ref:\s+reaper-[a-z0-9]+/m;
      const hasRef = refPattern.test(raw);

      if (!hasRef) {
        return [
          false,
          `Commit must include a Beads issue reference in footer.\n` +
            `Expected format: Ref: reaper-xxx\n` +
            `Tip: Use 'bd list' to see available issues, or 'bd create' to make one.\n` +
            `Note: chore commits are exempt from this requirement.`,
        ];
      }

      return [true, 'Valid Beads reference found'];
    },
  },
};

// Register the plugin
module.exports.plugins = [beadsRefPlugin];
