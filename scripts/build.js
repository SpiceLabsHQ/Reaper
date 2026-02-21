#!/usr/bin/env node
/**
 * @fileoverview EJS Template Build Script for Reaper Plugin
 *
 * Compiles EJS templates from src/ directories to their corresponding output
 * locations in the project root. Handles YAML frontmatter preservation and
 * provides template variables based on agent type and capabilities.
 *
 * @author Reaper Plugin
 * @version 1.0.0
 *
 * @example
 * // Basic build
 * node scripts/build.js
 *
 * @example
 * // Watch mode
 * node scripts/build.js --watch
 *
 * @example
 * // Build specific type only
 * node scripts/build.js --type=agents
 *
 * @example
 * // Verbose output
 * node scripts/build.js --verbose
 */

const fs = require('fs');
const path = require('path');

/**
 * Agent type classifications for template variable inference.
 * Maps agent types to their member agent names.
 * @constant {Object.<string, string[]>}
 */
const AGENT_TYPES = {
  coding: [
    'bug-fixer',
    'feature-developer',
    'refactoring-dev',
    'integration-engineer',
  ],
  review: ['security-auditor', 'test-runner'],
  planning: [
    'workflow-planner',
    'api-designer',
    'database-architect',
    'cloud-architect',
    'event-architect',
    'observability-architect',
    'frontend-architect',
    'data-engineer',
    'test-strategist',
    'compliance-architect',
  ],
  operations: ['branch-manager', 'deployment-engineer', 'incident-responder'],
  documentation: [
    'technical-writer',
    'claude-agent-architect',
    'ai-prompt-engineer',
    'principal-engineer',
  ],
  performance: ['performance-engineer'],
};

/**
 * Agents that use TDD methodology.
 * @constant {string[]}
 */
const TDD_AGENTS = ['bug-fixer', 'feature-developer', 'refactoring-dev'];

/**
 * Source directory mappings to output directories.
 * Key is the source subdirectory name, value is the output directory.
 * @constant {Object.<string, string>}
 */
const DIRECTORY_MAP = {
  agents: 'agents',
  skills: 'skills',
  commands: 'commands',
  hooks: 'hooks',
};

/**
 * Build configuration and state.
 */
const config = {
  /** @type {boolean} Whether to watch for file changes */
  watch: false,
  /** @type {string|null} Specific type to build (null = all) */
  type: null,
  /** @type {boolean} Enable verbose output */
  verbose: false,
  /** @type {string} Project root directory */
  rootDir: path.resolve(__dirname, '..'),
  /** @type {string} Source directory for templates */
  srcDir: path.resolve(__dirname, '..', 'src'),
};

/**
 * Build statistics tracker.
 */
const stats = {
  /** @type {number} Number of files processed successfully */
  success: 0,
  /** @type {number} Number of files that failed to process */
  errors: 0,
  /** @type {number} Number of files skipped */
  skipped: 0,
  /** @type {string[]} Array of error messages */
  errorMessages: [],
};

/**
 * EJS module (lazily loaded).
 * @type {Object|null}
 */
let ejs = null;

/**
 * Lazily loads the EJS module.
 * @returns {Object} The EJS module
 * @throws {Error} If EJS is not installed
 */
/* node:coverage disable */
function loadEjs() {
  if (ejs === null) {
    try {
      ejs = require('ejs');
    } catch (_err) {
      console.error(
        'Error: EJS module not found. Please run: npm install ejs --save-dev'
      );
      process.exit(1);
    }
  }
  return ejs;
}
/* node:coverage enable */

/**
 * Logs a message if verbose mode is enabled.
 * @param {...any} args - Arguments to log
 */
/* node:coverage disable */
function verboseLog(...args) {
  if (config.verbose) {
    console.log('[verbose]', ...args);
  }
}
/* node:coverage enable */

/**
 * Parses command line arguments.
 * @param {string[]} args - Command line arguments (process.argv.slice(2))
 */
function parseArgs(args) {
  for (const arg of args) {
    if (arg === '--watch' || arg === '-w') {
      config.watch = true;
    } else if (arg.startsWith('--type=')) {
      config.type = arg.split('=')[1];
      if (!DIRECTORY_MAP[config.type]) {
        console.error(
          `Error: Invalid type '${config.type}'. Valid types: ${Object.keys(DIRECTORY_MAP).join(', ')}`
        );
        process.exit(1);
      }
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
}

/**
 * Prints help information.
 */
/* node:coverage disable */
function printHelp() {
  console.log(`
EJS Template Build Script for Reaper Plugin

Usage: node scripts/build.js [options]

Options:
  --watch, -w     Watch for changes and rebuild automatically
  --type=TYPE     Only build specific type (agents, skills, commands, hooks)
  --verbose, -v   Show detailed output
  --help, -h      Show this help message

Examples:
  node scripts/build.js                    # Build all templates
  node scripts/build.js --watch            # Watch mode
  node scripts/build.js --type=agents      # Build only agents
  node scripts/build.js --verbose          # Verbose output
`);
}
/* node:coverage enable */

/**
 * Gets the agent type for a given agent name.
 * @param {string} agentName - The name of the agent (e.g., 'bug-fixer')
 * @returns {string} The agent type (e.g., 'coding') or 'unknown'
 */
function getAgentType(agentName) {
  for (const [type, agents] of Object.entries(AGENT_TYPES)) {
    if (agents.includes(agentName)) {
      return type;
    }
  }
  return 'unknown';
}

/**
 * Builds template variables for a given source file.
 * @param {string} sourceType - The type of source (agents, skills, etc.)
 * @param {string} filename - The filename without extension
 * @param {string} relativePath - The relative path from source directory
 * @returns {Object} Template variables to pass to EJS
 */
function buildTemplateVars(sourceType, filename, relativePath) {
  const vars = {
    FILENAME: filename,
    SOURCE_TYPE: sourceType,
    RELATIVE_PATH: relativePath,
    BUILD_TIMESTAMP: new Date().toISOString(),
  };

  // Agent-specific variables
  if (sourceType === 'agents') {
    const agentType = getAgentType(filename);
    if (agentType === 'unknown') {
      throw new Error(
        `Agent "${filename}" has no AGENT_TYPES classification. Add it to AGENT_TYPES in build.js or rename the file.`
      );
    }
    vars.AGENT_NAME = filename;
    vars.AGENT_TYPE = agentType;
    vars.HAS_TDD = TDD_AGENTS.includes(filename);
    vars.HAS_GIT_PROHIBITIONS = AGENT_TYPES.coding.includes(filename);
    vars.IS_CODING_AGENT = AGENT_TYPES.coding.includes(filename);
    vars.IS_REVIEW_AGENT = AGENT_TYPES.review.includes(filename);
    vars.IS_PLANNING_AGENT = AGENT_TYPES.planning.includes(filename);
    vars.IS_OPERATIONS_AGENT = AGENT_TYPES.operations.includes(filename);
    vars.IS_DOCUMENTATION_AGENT = AGENT_TYPES.documentation.includes(filename);
    vars.IS_PERFORMANCE_AGENT = AGENT_TYPES.performance.includes(filename);
  }

  // Skill-specific variables
  if (sourceType === 'skills') {
    vars.SKILL_NAME = filename;
    // Extract parent skill if nested (e.g., spice/CODE_FORMATTER -> spice)
    const pathParts = relativePath.split(path.sep);
    vars.PARENT_SKILL = pathParts.length > 2 ? pathParts[1] : null;
  }

  // Hook-specific variables
  if (sourceType === 'hooks') {
    vars.HOOK_NAME = filename;
  }

  return vars;
}

/**
 * Parses YAML frontmatter from content.
 * Returns the frontmatter string and the remaining content.
 * @param {string} content - The file content
 * @returns {{frontmatter: string|null, body: string}} Parsed result
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(frontmatterRegex);

  if (match) {
    return {
      frontmatter: match[0],
      body: content.slice(match[0].length),
    };
  }

  return {
    frontmatter: null,
    body: content,
  };
}

/**
 * Compiles an EJS template with the given variables.
 * @param {string} templateContent - The EJS template content
 * @param {Object} vars - Template variables
 * @param {string} templatePath - The path to the template file (for includes)
 * @returns {string} The compiled content
 * @throws {Error} If compilation fails
 */
function compileTemplate(templateContent, vars, templatePath) {
  const ejsModule = loadEjs();

  return ejsModule.render(templateContent, vars, {
    filename: templatePath,
    root: config.srcDir,
    views: [config.srcDir, path.join(config.srcDir, 'partials')],
    async: false,
  });
}

/**
 * Processes a single EJS file.
 * @param {string} sourcePath - Absolute path to the source file
 * @param {string} outputPath - Absolute path to the output file
 * @param {string} sourceType - The type of source (agents, skills, etc.)
 * @param {string} relativePath - Relative path from source directory
 * @returns {boolean} True if successful, false otherwise
 */
function processFile(sourcePath, outputPath, sourceType, relativePath) {
  const filename = path.basename(sourcePath, '.ejs');

  verboseLog(`Processing: ${sourcePath}`);
  verboseLog(`Output: ${outputPath}`);

  try {
    // Read the source file
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Parse frontmatter
    const { frontmatter, body } = parseFrontmatter(content);

    // Build template variables
    const vars = buildTemplateVars(sourceType, filename, relativePath);

    // Compile the EJS template
    const compiledBody = compileTemplate(body, vars, sourcePath);

    // Combine frontmatter and compiled content
    const output = frontmatter ? frontmatter + compiledBody : compiledBody;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      verboseLog(`Created directory: ${outputDir}`);
    }

    // Write the output file
    fs.writeFileSync(outputPath, output, 'utf8');

    console.log(`  [OK] ${relativePath}`);
    stats.success++;
    return true;
  } catch (err) {
    const errorMsg = formatError(err, sourcePath);
    console.error(`  [ERROR] ${relativePath}`);
    console.error(`          ${errorMsg}`);
    stats.errors++;
    stats.errorMessages.push(`${relativePath}: ${errorMsg}`);
    return false;
  }
}

/**
 * Formats an error message with line numbers if available.
 * @param {Error} err - The error object
 * @param {string} sourcePath - Path to the source file
 * @returns {string} Formatted error message
 */
function formatError(err, _sourcePath) {
  if (err.message && err.message.includes('ejs:')) {
    // EJS error with line number
    return err.message;
  }

  if (err.line) {
    return `Line ${err.line}: ${err.message}`;
  }

  return err.message || String(err);
}

/**
 * Copies a non-template file to the output directory.
 * @param {string} sourcePath - Absolute path to the source file
 * @param {string} outputPath - Absolute path to the output file
 * @param {string} relativePath - Relative path from source directory
 * @returns {boolean} True if successful, false otherwise
 */
function copyFile(sourcePath, outputPath, relativePath) {
  verboseLog(`Copying: ${sourcePath} -> ${outputPath}`);

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, outputPath);
    console.log(`  [COPY] ${relativePath}`);
    stats.success++;
    return true;
  } catch (err) {
    console.error(`  [ERROR] ${relativePath}: ${err.message}`);
    stats.errors++;
    stats.errorMessages.push(`${relativePath}: ${err.message}`);
    return false;
  }
}

/**
 * Recursively finds all files in a directory.
 * @param {string} dir - Directory to search
 * @param {string[]} [files=[]] - Accumulator for found files
 * @returns {string[]} Array of absolute file paths
 */
function findFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`  [ERROR] Failed to read directory ${dir}: ${err.message}`);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Builds all templates for a specific source type.
 * @param {string} sourceType - The type to build (agents, skills, etc.)
 */
function buildType(sourceType) {
  const sourceDir = path.join(config.srcDir, sourceType);
  const outputDir = path.join(config.rootDir, DIRECTORY_MAP[sourceType]);

  if (!fs.existsSync(sourceDir)) {
    verboseLog(`Skipping ${sourceType}: source directory does not exist`);
    return;
  }

  console.log(`\nBuilding ${sourceType}...`);

  const files = findFiles(sourceDir);

  for (const sourcePath of files) {
    const relativePath = path.relative(config.srcDir, sourcePath);
    const relativeFromType = path.relative(sourceDir, sourcePath);

    if (sourcePath.endsWith('.ejs')) {
      // EJS template - compile it
      const outputFilename = relativeFromType.replace(/\.ejs$/, '.md');
      const outputPath = path.join(outputDir, outputFilename);
      processFile(sourcePath, outputPath, sourceType, relativePath);
    } else {
      // Non-template file - copy it
      const outputPath = path.join(outputDir, relativeFromType);
      copyFile(sourcePath, outputPath, relativePath);
    }
  }
}

/**
 * Runs the full build process.
 */
function build() {
  console.log('Reaper EJS Template Build');
  console.log('=========================');

  // Reset stats
  stats.success = 0;
  stats.errors = 0;
  stats.skipped = 0;
  stats.errorMessages = [];

  // Check if src directory exists
  if (!fs.existsSync(config.srcDir)) {
    console.log('\nNo src/ directory found. Nothing to build.');
    return;
  }

  // Build specified type or all types
  if (config.type) {
    buildType(config.type);
  } else {
    for (const sourceType of Object.keys(DIRECTORY_MAP)) {
      buildType(sourceType);
    }
  }

  // Print summary
  console.log('\n--------------------------');
  console.log('Build Summary:');
  console.log(`  Success: ${stats.success}`);
  console.log(`  Errors:  ${stats.errors}`);

  if (stats.errors > 0) {
    console.log('\nErrors:');
    for (const msg of stats.errorMessages) {
      console.log(`  - ${msg}`);
    }
  }

  console.log('--------------------------\n');
}

/**
 * Sets up file watching for automatic rebuilds.
 */
/* node:coverage disable */
function watchFiles() {
  console.log('Watching for changes... (Press Ctrl+C to stop)\n');

  const chokidar = loadChokidar();

  const watcher = chokidar.watch(config.srcDir, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    console.log(`\nFile changed: ${path.relative(config.srcDir, filePath)}`);
    build();
  });

  watcher.on('add', (filePath) => {
    console.log(`\nFile added: ${path.relative(config.srcDir, filePath)}`);
    build();
  });

  watcher.on('unlink', (filePath) => {
    console.log(`\nFile removed: ${path.relative(config.srcDir, filePath)}`);
    // Note: We don't automatically delete output files
    console.log(
      '  (Output file not automatically removed - manual cleanup may be needed)'
    );
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });
}
/* node:coverage enable */

/**
 * Lazily loads the chokidar module for file watching.
 * @returns {Object} The chokidar module
 */
/* node:coverage disable */
function loadChokidar() {
  try {
    return require('chokidar');
  } catch (_err) {
    console.error(
      'Error: chokidar module not found. For watch mode, please run: npm install chokidar --save-dev'
    );
    process.exit(1);
  }
}
/* node:coverage enable */

/**
 * Main entry point.
 */
function main() {
  try {
    // Parse command line arguments
    parseArgs(process.argv.slice(2));

    // Run initial build
    build();
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  }

  // Start watching if requested
  if (config.watch) {
    watchFiles();
  } else {
    // Exit with appropriate code
    process.exit(stats.errors > 0 ? 1 : 0);
  }
}

// Run if executed directly
/* node:coverage disable */
if (require.main === module) {
  main();
}
/* node:coverage enable */

// Export for testing
module.exports = {
  parseArgs,
  getAgentType,
  buildTemplateVars,
  parseFrontmatter,
  compileTemplate,
  processFile,
  formatError,
  copyFile,
  findFiles,
  buildType,
  build,
  main,
  AGENT_TYPES,
  TDD_AGENTS,
  DIRECTORY_MAP,
  config,
  stats,
};
