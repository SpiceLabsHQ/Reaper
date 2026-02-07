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

## Formatter Allowlist

By default, the hook runs any formatter it detects. If you want to restrict which formatters are allowed to execute, add an allowlist to your project's `CLAUDE.md`:

```
Reaper: formatter-allowlist prettier,ruff
```

When an allowlist is configured, only the named formatters will run. All others are silently skipped. Formatter names are the short identifiers used in the table above: `pint`, `php-cs-fixer`, `ruff`, `black`, `gofmt`, `rustfmt`, `rubocop`, `swiftformat`, `ktlint`, `dart`, `prettier`, `biome`, `eslint`.

If no `Reaper: formatter-allowlist` line is present in `CLAUDE.md`, the hook runs all detected formatters as before. This is fully backwards compatible.

### Example allowlist configurations

Allow only Prettier and Ruff:
```
Reaper: formatter-allowlist prettier,ruff
```

Allow only Pint (Laravel PHP):
```
Reaper: formatter-allowlist pint
```

## Execution Logging

The hook runs silently by default. If you want visibility into which formatters execute and on which files, enable logging by adding this line to your project's `CLAUDE.md`:

```
Reaper: formatter-log
```

When enabled, each formatter execution produces a log line on stderr:

```
[reaper:fmt] prettier src/components/App.tsx
[reaper:fmt] ruff src/utils/parser.py
```

The log shows the formatter name and the file path. This is useful for debugging formatter detection or verifying that your allowlist is working as expected. Logging does not affect formatter behavior -- the hook still suppresses formatter output and exits cleanly.

## What This Means for You

**No setup required.** The hook uses your project's existing formatters. If you have Prettier configured, it uses Prettier. If you have Ruff installed, it uses Ruff. There is nothing to configure in Reaper.

**Transparent operation.** Formatting happens silently after every write. You will not see formatter output or errors -- the hook suppresses all output and always exits successfully.

**Automatic discovery.** If you add a new formatter to your project (install Ruff, add a `.prettierrc`, drop in a `biome.json`), the hook picks it up on the next file write. No restart or reconfiguration needed.

**Quality gate savings.** Without auto-formatting, a code reviewer or linter would flag formatting issues, sending work back to the code agent for a fix-and-rerun cycle. The hook eliminates this class of failure entirely.

**Safe to ignore.** If no formatter is installed for a given file type, nothing happens. No errors, no warnings, no interruptions.

**Configurable when needed.** Use the allowlist to restrict formatters or enable logging for visibility. Both features are opt-in and configured through your project's `CLAUDE.md`, following the same pattern as other Reaper opt-in settings.

---

[Back to README](../README.md)
