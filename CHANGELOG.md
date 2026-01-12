# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.1.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.0.0...v1.1.0) (2026-01-12)


### Features

* **release:** add automated semantic versioning with commit-and-tag-version ([b449185](https://github.com/SpiceLabsHQ/Reaper/commit/b449185d582c1c61d73118daa55cbeb26112f671))

## 1.0.0 (2026-01-12)


### Features

* **agents:** add 7 specialized agent specifications ([d89582a](https://github.com/SpiceLabsHQ/Reaper/commit/d89582a372f3f4ff8e9ccbb84035774f83308e8d))
* **agents:** add claude-agent-architect for agent design standards ([3ca2062](https://github.com/SpiceLabsHQ/Reaper/commit/3ca206232e17913db7ecf72963a3215ec3c1e1c2))
* **agents:** add input validation and Beads hierarchy queries to workflow-planner ([8abb08d](https://github.com/SpiceLabsHQ/Reaper/commit/8abb08dcaee8e9ebe0a175840f95a9ccdb41151a))
* **agents:** enforce modern workflow requirements ([5f23032](https://github.com/SpiceLabsHQ/Reaper/commit/5f230324f86d9e6f434b0e48574b719c9cb62645))
* **agents:** integrate worktree-manager skill into workflow-planner and orchestrate ([bff3eca](https://github.com/SpiceLabsHQ/Reaper/commit/bff3eca7e801eaf3e7b76769403d8c7fff56c42c))
* **agents:** update model assignments for Haiku 4.5 and Sonnet 4.5 ([d32eca4](https://github.com/SpiceLabsHQ/Reaper/commit/d32eca4330f3d45025d2cfaf357c95345cae9be9))
* **beads:** configure beads-sync orphan branch with auto-push ([ac1f1ea](https://github.com/SpiceLabsHQ/Reaper/commit/ac1f1eab5193581d8e6e631f3853aa1466ecbf2c))
* **commands:** add claude-sync slash command ([bbdfb36](https://github.com/SpiceLabsHQ/Reaper/commit/bbdfb368cdbd0ce359253f6b2352d283d0d9381e))
* **commands:** add spice:plan autonomous execution planner ([8d7b19b](https://github.com/SpiceLabsHQ/Reaper/commit/8d7b19b4e2633aeeedf57ecaf613749f9fa9bd47))
* enhance test validation with directory detection and organization checks ([e313a07](https://github.com/SpiceLabsHQ/Reaper/commit/e313a07eda04b3c7e553d9b59c57758ff0c322ea))
* **hooks:** add context-aware notifications with custom messages ([5cd79ec](https://github.com/SpiceLabsHQ/Reaper/commit/5cd79ec9d3aedf4be902878933a809787ce91fff))
* **hooks:** add Pushover notification on Stop event ([770fcbf](https://github.com/SpiceLabsHQ/Reaper/commit/770fcbf84bc50875060429baa38e3da45af1b755))
* **hooks:** add SubagentStop hook for automatic quality gates ([1fa8b29](https://github.com/SpiceLabsHQ/Reaper/commit/1fa8b2958aaffa127577d0ee65dcd202b20c1153))
* **orchestrator:** add flexible task ID system with multi-platform support ([161027f](https://github.com/SpiceLabsHQ/Reaper/commit/161027f18807b365445889d5bd32fd760a7f9017)), closes [#456](https://github.com/SpiceLabsHQ/Reaper/issues/456)
* **permissions:** add Beads CLI and MCP tool permissions ([6047afe](https://github.com/SpiceLabsHQ/Reaper/commit/6047afe3377f065891fa0acd5942bc8c5dc6f13b))
* **permissions:** add Context7 MCP tools to allow list ([32318b3](https://github.com/SpiceLabsHQ/Reaper/commit/32318b322ce2d6524ec3b5eb40cc591e3f7b5ac5))
* **plugin:** convert repository to Claude Code plugin structure ([9d14ce9](https://github.com/SpiceLabsHQ/Reaper/commit/9d14ce921c4da46277371b236c20a5cd706716dc))
* **skills:** add SPICE workflow automation skills package ([843304a](https://github.com/SpiceLabsHQ/Reaper/commit/843304a0c5f9cab1fdd326947734c4d12fb5b44e))
* **skills:** add worktree-manager skill with safe cleanup scripts ([9027b20](https://github.com/SpiceLabsHQ/Reaper/commit/9027b20a1beb01f293c267a27b9ac903173eb065))
* **spice:orchestrate:** improve task naming and user feedback flow ([9abc0e2](https://github.com/SpiceLabsHQ/Reaper/commit/9abc0e21cbaf48faa5fe5497d8bda8d17f3ff7c6))
* **spice:plan:** add issue verification phase ([8c9b1a7](https://github.com/SpiceLabsHQ/Reaper/commit/8c9b1a7e50772daec5c734768dc1a3237da64fff))
* **spice:plan:** add issue verification phase using workflow-planner ([0cbc75d](https://github.com/SpiceLabsHQ/Reaper/commit/0cbc75df0ebd5cfc54d60503977a5e7215db388d))
* **spice:plan:** add user intervention handling and assignment syntax ([928fc5b](https://github.com/SpiceLabsHQ/Reaper/commit/928fc5be764b566d9c076ecb8e7811cb13980c94))
* update system to use iterative workflow ([f11e156](https://github.com/SpiceLabsHQ/Reaper/commit/f11e1565729e6ea4674e599c1315a7437ce763d2))
* **workflow-planner:** add content generation complexity dimension ([771f281](https://github.com/SpiceLabsHQ/Reaper/commit/771f281151eb0f50c7f6c4c5c23dc99c2c22fa6b))


### Bug Fixes

* **agents:** standardize nomenclature and fix inconsistencies in quality gate agents ([abc3b1a](https://github.com/SpiceLabsHQ/Reaper/commit/abc3b1a007a39d74669e5180b709718f0d39247c))
* **commands:** add close task reminder to takeoff TodoWrite ([7fcb610](https://github.com/SpiceLabsHQ/Reaper/commit/7fcb61095a31723be8fa72c2b3a8cfea69357c1b))
* **commands:** add conditional TodoWrite items to takeoff ([dd77fbc](https://github.com/SpiceLabsHQ/Reaper/commit/dd77fbc6a7e1f3d18dfadb1400a02a9195bc9388))
* **config:** initialize variable and reorder permissions sections ([c5592af](https://github.com/SpiceLabsHQ/Reaper/commit/c5592af12b2ffdb6e8a3212844822ce2eb3c4e01))
* **hooks:** format notification with context on separate line ([fc96b6e](https://github.com/SpiceLabsHQ/Reaper/commit/fc96b6ec98b299d4369b5d001c82560599a3fc5f))
* **skills:** use CLAUDE_PLUGIN_ROOT for portable path references ([8437556](https://github.com/SpiceLabsHQ/Reaper/commit/8437556f0976cbbd2f1d8ca3f88cf447f8cb024a))
* **spice:plan:** add Phase 7 completion protocol to prevent implementation after planning ([78c252f](https://github.com/SpiceLabsHQ/Reaper/commit/78c252f277953791f9526834321986293ecd5a3f))
* **spice:plan:** correct Beads dependency syntax for parent-child vs blockers ([cb55f56](https://github.com/SpiceLabsHQ/Reaper/commit/cb55f56a8eec59f8de54bf600f7f0fe0d145d671))


### Refactoring

* **agents:** add reaper: prefix to all agent references ([de28f25](https://github.com/SpiceLabsHQ/Reaper/commit/de28f25d35a9f1ab34f054527584b9964dafb51b))
* **agents:** centralize worktree management in branch-manager ([334809d](https://github.com/SpiceLabsHQ/Reaper/commit/334809de013b43a60a3baa7d3fc694059638f01d))
* **agents:** enforce separation of concerns and dual authorization ([d6087eb](https://github.com/SpiceLabsHQ/Reaper/commit/d6087ebc9278fb1706f10cd4781fa3e29111df88))
* **agents:** improve model selection and workflow stage colors ([ccc5f68](https://github.com/SpiceLabsHQ/Reaper/commit/ccc5f68c5a18e255821f24fc3999706e7183618d))
* **agents:** optimize model declarations for auto-selection ([8e52cdd](https://github.com/SpiceLabsHQ/Reaper/commit/8e52cddc5fe47f085a1a6a6e8a5c31a6707ec403))
* **agents:** qualify agent names with reaper: prefix ([d693ccf](https://github.com/SpiceLabsHQ/Reaper/commit/d693ccfd324585a2f5d3e2acd4a6740b6526ea73))
* **agents:** separate orchestration and strategy planning concerns ([6b1854b](https://github.com/SpiceLabsHQ/Reaper/commit/6b1854bb0c6057ed7259a9da99c28917c04e00ae))
* **agents:** simplify quality gate workflow with auto-iteration ([6ad1b7d](https://github.com/SpiceLabsHQ/Reaper/commit/6ad1b7dc4ac6dc48dc6b1ef96a4c2f238836b9f4))
* **claude:** remove archived settings, enable plugin-dev plugin ([74dd87a](https://github.com/SpiceLabsHQ/Reaper/commit/74dd87a26172ff499b146c5246a506ee554e6bd7))
* **commands:** rename plan→flight-plan, orchestrate→takeoff ([0eb1a46](https://github.com/SpiceLabsHQ/Reaper/commit/0eb1a46835554ad72bc1edbe6b2d364f40111d8d))
* **gitignore:** switch to whitelist-based ignore pattern ([763b27e](https://github.com/SpiceLabsHQ/Reaper/commit/763b27e526c00ffab5e750928125638f7b036d62))
* **scripts:** move acli-jira-auth.sh to scripts directory ([5778403](https://github.com/SpiceLabsHQ/Reaper/commit/57784039598996f021002365964d7d319da876ee))
* **spice:orchestrate:** streamline quality gate auto-iteration ([857f3b1](https://github.com/SpiceLabsHQ/Reaper/commit/857f3b1e51f516ac22c39f2e6a950c42a71c7150))
* standardize JIRA_KEY/JIRA_TICKET to generic TASK_ID ([0ec4f10](https://github.com/SpiceLabsHQ/Reaper/commit/0ec4f10c7ea93fcad1c60d49eed34edf6f9017a5))


### Documentation

* add README and organize SPICE documentation ([34e012b](https://github.com/SpiceLabsHQ/Reaper/commit/34e012baef12a04e6205d6cdc669a34d13a3b880))
* **agents:** add examples to agent descriptions for orchestrator context ([0e973d7](https://github.com/SpiceLabsHQ/Reaper/commit/0e973d7e3d8038fa157b5a6608b085d44681f222))
* **agents:** add format template and document in README ([458d118](https://github.com/SpiceLabsHQ/Reaper/commit/458d118e5f9f726fb1a7ae18ccfb7d7a53ac46c8))
* **agents:** clarify quality-gate-controlled commits ([8be1112](https://github.com/SpiceLabsHQ/Reaper/commit/8be111270030d9fa5c41757eda89d019a6046097))
* **agents:** establish workflow-based color standard for visual progress feedback ([2ba46f6](https://github.com/SpiceLabsHQ/Reaper/commit/2ba46f6c8cac26799703d8110c681de120b882ec))
* **agents:** remove file-writing examples that conflict with JSON output requirement ([fbf9641](https://github.com/SpiceLabsHQ/Reaper/commit/fbf9641308f8f4de616d5492fbec4054f51edd01))
* **agents:** reorganize by workflow stage and add new specialized agents ([8b51dae](https://github.com/SpiceLabsHQ/Reaper/commit/8b51daeb586f314d8f8041f7f30603aa39981e90))
* **commands:** update descriptions with aviation theming ([f3557c7](https://github.com/SpiceLabsHQ/Reaper/commit/f3557c7d1c9e69f28c3d974fa837e60bb9eb70df))
* complete SPICE file moves to docs/spice/ ([3f6166e](https://github.com/SpiceLabsHQ/Reaper/commit/3f6166ecfec2bb2057ecba23fc39c0948bf6ac94))
* **readme:** refresh brand voice with aviation theme ([6563938](https://github.com/SpiceLabsHQ/Reaper/commit/6563938441e2e3d47fdbfb4002332782eedb49c9))
* refactor standards to reduce context usage with role clarity ([e034026](https://github.com/SpiceLabsHQ/Reaper/commit/e034026ff4dda029bbbd06a35803022756accfa4))
* **spice:** add cloud infrastructure standards ([36de383](https://github.com/SpiceLabsHQ/Reaper/commit/36de383f55b8babace94c2d6d1a39d6ca18fc970))
* **spice:** add OIDC authentication guide for Bitbucket Pipelines ([f96b2d0](https://github.com/SpiceLabsHQ/Reaper/commit/f96b2d049a87fc6f2cfe9557de0fd1b9ffddeadd))


### Styling

* **commands:** add aviation-themed messaging to flight-plan and takeoff ([1f04973](https://github.com/SpiceLabsHQ/Reaper/commit/1f0497318c540e4403e92d9b2e80907554802ab8))
