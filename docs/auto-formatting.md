# Auto-Formatting

Reaper includes a PostToolUse hook that auto-formats code after every file write or edit. When Claude writes or edits a file, the hook detects the appropriate formatter for that file type and runs it immediately. This means formatting happens as code is written, not as a separate step -- and formatting issues never reach the quality gates.

## How It Works

The hook is registered as a `PostToolUse` handler that matches `Write` and `Edit` tool invocations. When either tool completes, the hook:

1. Reads the file path from `$CLAUDE_FILE_PATH`
2. Extracts the file extension
3. Looks up a formatter for that extension
4. Runs the formatter against the file, in place
5. Exits cleanly regardless of outcome -- formatter errors are suppressed, never interrupting your workflow

No configuration is required. The hook uses whatever formatters your project already has installed.

## Supported Formatters

| Language | Extension(s) | Formatter | How it's detected |
|----------|-------------|-----------|-------------------|
| PHP (Laravel) | `.php`, `.blade.php` | Pint | `vendor/bin/pint` exists |
| PHP | `.php`, `.blade.php` | PHP-CS-Fixer | `vendor/bin/php-cs-fixer` or `php-cs-fixer` on PATH |
| Python | `.py` | Ruff | `ruff` on PATH |
| Python | `.py` | Black | `black` on PATH |
| Go | `.go` | gofmt | `gofmt` on PATH |
| Rust | `.rs` | rustfmt | `rustfmt` on PATH |
| Ruby | `.rb` | RuboCop | `rubocop` on PATH |
| Swift | `.swift` | SwiftFormat | `swiftformat` on PATH |
| Kotlin | `.kt`, `.kts` | ktlint | `ktlint` on PATH |
| Dart | `.dart` | dart format | `dart` on PATH |
| JS/TS/CSS/HTML | all other extensions | Prettier | Config file in project root |
| JS/TS | all other extensions | Biome | `biome.json` or `biome.jsonc` in project root |
| JS/TS | all other extensions | ESLint | Config file in project root |

### Prettier config detection

The hook checks for any of these files: `.prettierrc`, `.prettierrc.json`, `.prettierrc.js`, `prettier.config.js`, `prettier.config.mjs`, `prettier.config.cjs`.

### ESLint config detection

The hook checks for any of these files: `.eslintrc`, `.eslintrc.json`, `.eslintrc.js`, `eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs`.

## Detection Priority

When multiple formatters are available for the same language, the hook uses the first one it finds. Priority order per language:

**PHP**: Pint > PHP-CS-Fixer (vendor) > PHP-CS-Fixer (global)

Pint is checked first because it is the Laravel convention. If Pint is not present, the hook falls back to PHP-CS-Fixer in `vendor/bin/`, then to a globally installed `php-cs-fixer`.

**Python**: Ruff > Black

Ruff is checked first. When Ruff is used, the hook runs both `ruff format` (formatting) and `ruff check --fix` (auto-fixable lint rules). Black only handles formatting.

**JS/TS and web files** (fallback tier): Prettier > Biome > ESLint

These are project-level formatters detected by config file presence, not file extension. They apply to any file extension that does not match a language-specific formatter above -- meaning a `.js` file will hit this fallback path, not a dedicated JS formatter.

## Two-Tier Detection

The hook uses a two-tier detection strategy:

**Tier 1 -- Language-specific formatters.** Matched by file extension. If the file is `.py`, `.go`, `.rs`, `.rb`, `.php`, `.swift`, `.kt`, `.kts`, or `.dart`, the hook looks for the corresponding language formatter. If one is found, it runs and the hook is done.

**Tier 2 -- Project-level formatters.** If the file extension does not match any language-specific formatter, the hook falls back to checking for project-level config files (Prettier, Biome, ESLint) in priority order. This covers JS, TS, CSS, HTML, JSON, YAML, and any other file type these tools handle.

A file is never formatted twice. The first matching formatter wins.

## What This Means for You

**No setup required.** The hook uses your project's existing formatters. If you have Prettier configured, it uses Prettier. If you have Ruff installed, it uses Ruff. There is nothing to configure in Reaper.

**Transparent operation.** Formatting happens silently after every write. You will not see formatter output or errors -- the hook suppresses all output and always exits successfully.

**Automatic discovery.** If you add a new formatter to your project (install Ruff, add a `.prettierrc`, drop in a `biome.json`), the hook picks it up on the next file write. No restart or reconfiguration needed.

**Quality gate savings.** Without auto-formatting, a code reviewer or linter would flag formatting issues, sending work back to the code agent for a fix-and-rerun cycle. The hook eliminates this class of failure entirely.

**Safe to ignore.** If no formatter is installed for a given file type, nothing happens. No errors, no warnings, no interruptions.

---

[Back to README](../README.md)
