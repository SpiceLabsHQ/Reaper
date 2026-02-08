# src/commands/

## Adding a New Command

When adding a new user-invocable command:

1. Create the EJS template here (`src/commands/<name>.ejs`)
2. Run `npm run build` to generate `commands/<name>.md`
3. Register the command in `scripts/contracts.test.js`:
   - Add `'<name>'` to the `ALL_COMMANDS` array (frontmatter validation)
   - Add a `'<name>'` entry to `COMMAND_SEMANTIC_CONTRACTS` with required section patterns
   - Add `registerCommandSemanticSuite('<name>')` call
4. Update documentation:
   - `docs/commands.md` — full command reference section
   - `CLAUDE.md` — Key Commands block and User-Invocable Commands list
   - `README.md` — if the command is a primary entry point

These registrations are **not auto-discovered** from the filesystem. Missing them means contract tests silently skip the new command.
