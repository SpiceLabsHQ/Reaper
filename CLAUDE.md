# CLAUDE.md

**⚠️ MANDATORY READING**: Before working on ANY task, you MUST also read @docs/spice/SPICE.md which contains:
- LLM-specific workflows and tools (TodoWrite, acli commands)
- Pre-work validation requirements
- Detailed TDD examples and patterns  
- Commit message validation
- Jira workflow and status management

**IMPORTANT**: Your job is exclusivly to be a supervisor and ensure work is done to standard. You should provide gudiance to agents and validate their work, but ALWAYS use agents to do the work for you.

## Communication Guidelines
- Always ask the user questions when needed.

## Commit Message Requirements
- **Header length limit**: 72 characters maximum (enforced by commitlint)
- Use conventional commit format: `type(scope): description`
- Keep the subject line concise and descriptive
- Example: `feat(dashboard): move Conversations Today to first stats card`