# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.9.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.2...v1.9.0) (2026-02-09)


### Features

* **commands:** integrate TAKING OFF into takeoff and status-worktrees ([7b37646](https://github.com/SpiceLabsHQ/Reaper/commit/7b376468d3ebed80e72daeacc80cd937a43be32d))
* **strategy:** add single-document de-escalation override ([b726382](https://github.com/SpiceLabsHQ/Reaper/commit/b726382c4819b80327b9a8d9b13deb1b8a28cc37))
* **visual-vocab:** add TAKING OFF gauge state ([3365951](https://github.com/SpiceLabsHQ/Reaper/commit/336595138e7af9f98aa1b6b50dbfce8e56a4fed1))


### Bug Fixes

* **commands:** replace Five Keys scorecard with Design Quality in squadron ([2cb0bc3](https://github.com/SpiceLabsHQ/Reaper/commit/2cb0bc3f85fbcc24fc3af865f3487b8da3c94951))
* **flight-plan:** reinforce hierarchy vs dependency distinction in Phase 5 ([c693ff0](https://github.com/SpiceLabsHQ/Reaper/commit/c693ff06820c13351481099b9b80eae06f70c386))
* **partials:** strengthen hierarchy vs dependency guidance in task-system-operations ([df71947](https://github.com/SpiceLabsHQ/Reaper/commit/df719475238fc2b4193410f7d1da21f8b131250b))
* **workflow-planner:** remove parent-child from dependency type table ([e40d1cf](https://github.com/SpiceLabsHQ/Reaper/commit/e40d1cf195f99515bed6c87345e6ad1a583bd8b4))


### Tests

* **squadron:** add scope boundary contract and update test rationale ([7ac9c25](https://github.com/SpiceLabsHQ/Reaper/commit/7ac9c254011920d6774eac54cdcb5a215d625b17))

## [1.8.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.1...v1.8.2) (2026-02-08)


### Documentation

* **claude:** add scope boundary for Reaper-specific guidance ([21013f8](https://github.com/SpiceLabsHQ/Reaper/commit/21013f856eb8d028e0d5011b80a1c5eb90138d9d))

## [1.8.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.0...v1.8.1) (2026-02-08)


### Bug Fixes

* **build:** regenerate start.md with ON APPROACH gauge state ([6dc2229](https://github.com/SpiceLabsHQ/Reaper/commit/6dc22296d3fc8fe0e0509b0c676abbc1dd656f33))

## [1.8.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.7.0...v1.8.0) (2026-02-08)


### Features

* add formatter allowlist, build.js error handling, explore-first docs ([17756f7](https://github.com/SpiceLabsHQ/Reaper/commit/17756f7cdd86f33a2db0c81190dcb24ebaeaf46e))
* **agents:** add 6 new planning agents for war room expert panel ([aca39db](https://github.com/SpiceLabsHQ/Reaper/commit/aca39dbf2b34ef115278f9dd985a1efd8207fc24))
* **agents:** add 6 planning agents for war room expert panel expansion ([b6b1ba4](https://github.com/SpiceLabsHQ/Reaper/commit/b6b1ba4347e5d38b7be8a982a32aa2d43152146c))
* **agents:** add ai-prompt-engineer agent ([2ee31d2](https://github.com/SpiceLabsHQ/Reaper/commit/2ee31d26e90d8b9bd389afd6bd13b4402020356d))
* **agents:** add multi-model prompt engineering guidance ([9af6500](https://github.com/SpiceLabsHQ/Reaper/commit/9af6500dbfaceb3c1e1a2e44a261f61250e53d5f))
* **commands:** add command contracts, ship scan patterns, coverage thresholds ([ede90ac](https://github.com/SpiceLabsHQ/Reaper/commit/ede90acd1ba1b8037594f99cfa06d035cbe970a0))
* **commands:** add war-room collaborative design session command ([269e0f7](https://github.com/SpiceLabsHQ/Reaper/commit/269e0f743cbb4363b77dde659be71c0ccc782efc))
* **commands:** re-theme huddle command to squadron ([f6fd593](https://github.com/SpiceLabsHQ/Reaper/commit/f6fd593b4c3d028213b260ca21029986da746489))
* **commands:** update Gate Panel to use gate statuses and add ON APPROACH to commands ([bf65a15](https://github.com/SpiceLabsHQ/Reaper/commit/bf65a15fd91a30c8dc67552a678b1939f9f6cc8a))
* **huddle:** redesign skill with 4-phase INTAKE/OPEN/CLASH/CONVERGE flow ([349ad6a](https://github.com/SpiceLabsHQ/Reaper/commit/349ad6a777a69c0d144ddddd8817765a1edbee79))
* **partials:** add visual-vocabulary.ejs with gauge states and card templates ([591df62](https://github.com/SpiceLabsHQ/Reaper/commit/591df62946a5dc85939a9c3deb6db00540ff0bd0))
* **quality-gates:** add gate infrastructure (U2, U3, U5, U11) ([75ddb35](https://github.com/SpiceLabsHQ/Reaper/commit/75ddb3554e51e6e587b2c21186ed61df8568afef))
* **quality-gates:** add GATE_MODE sections to 4 agents (U6-U9) ([f77513c](https://github.com/SpiceLabsHQ/Reaper/commit/f77513c7bcdb37da610f6ebc5e043d5034ead9a7))
* **quality-gates:** add work-type-aware gate profile system ([f3e793f](https://github.com/SpiceLabsHQ/Reaper/commit/f3e793f95f6426ab0916d2660351dc9493e0b297))
* **quality-gates:** create validation-runner agent template (U4) ([7cc8707](https://github.com/SpiceLabsHQ/Reaper/commit/7cc8707e60fc2d0bf35ee5dd520ec031493a9d3a))
* **quality-gates:** dynamic gate selection in takeoff orchestrator (U10) ([e5d9c3a](https://github.com/SpiceLabsHQ/Reaper/commit/e5d9c3ad51621586f6bdf20877243947e12ecf01))
* **quality-gates:** gate expectations and work_type field (U12, U13) ([e18bf47](https://github.com/SpiceLabsHQ/Reaper/commit/e18bf4770c5b982886ef86687925f47ef0ff9bc8))
* **quality:** add semantic contract tests, CI fix, docs accuracy, and context hygiene ([0cba1fb](https://github.com/SpiceLabsHQ/Reaper/commit/0cba1fb04026379133ff37ea79e8445340a93ab1))
* **security-auditor:** add timeout protection for scanning tools ([032c916](https://github.com/SpiceLabsHQ/Reaper/commit/032c9161a2c3c73acc5d576b7e8f9d2a8ad3787c))
* separate gauge states and quality gate vocabulary with ON APPROACH state ([6b6f20a](https://github.com/SpiceLabsHQ/Reaper/commit/6b6f20a56b6a79598d366d13209ad74b47a208ff))
* **ship:** add departure and landing cards with pipeline gauges ([14df16b](https://github.com/SpiceLabsHQ/Reaper/commit/14df16b4e917463b97d2710d4d795d403652051c))
* **squadron:** add stance summaries contract tests ([f9e36c9](https://github.com/SpiceLabsHQ/Reaper/commit/f9e36c9bd74ae232eede1a200b5be5e3640cf96b))
* **squadron:** integrate shared gauge vocabulary from visual-vocabulary partial ([8407a5c](https://github.com/SpiceLabsHQ/Reaper/commit/8407a5c5520504db9698b165dc6ab84544eba4e2))
* **squadron:** overhaul UX with visual vocabulary, editorial voice, and narrator-driven flow ([38771c3](https://github.com/SpiceLabsHQ/Reaper/commit/38771c354941c153a0413b1b82ff746900097835))
* **squadron:** replace scout-then-swarm with explore-first architecture ([cbce770](https://github.com/SpiceLabsHQ/Reaper/commit/cbce7702434ac61f1ef7e1e710837f5bc1ac31fb))
* **squadron:** ux overhaul with visual vocabulary and editorial voice ([d35ff2b](https://github.com/SpiceLabsHQ/Reaper/commit/d35ff2b8573add272f4cf353ab0ee282246bb26e))
* **start:** add /reaper:start educational entry-point command ([a22b9f5](https://github.com/SpiceLabsHQ/Reaper/commit/a22b9f59f267de2bf6efc3e1fbe7aeaa09797eb3))
* **status-worktrees:** transform summary into fleet dashboard ([cd4657d](https://github.com/SpiceLabsHQ/Reaper/commit/cd4657d2d82908a483dd02cb95e42c2533dfe9c6))
* **takeoff:** add iteration loop, file reading allowlist, and Quick Reference fix ([985d4c7](https://github.com/SpiceLabsHQ/Reaper/commit/985d4c7c66723062ea1ba28e29f495b26786b3c7))
* **takeoff:** add preflight card, gate panel, and touchdown card ([aa104f3](https://github.com/SpiceLabsHQ/Reaper/commit/aa104f3bee0cfe51f405d0358364f0d9d71fb5a6))
* **test-runner:** background task pattern with timeout polling for full suite runs ([895f7ba](https://github.com/SpiceLabsHQ/Reaper/commit/895f7ba7c4c52969588bbfd9641aa048e874acf7))
* **visual-vocabulary:** add ON APPROACH gauge state and quality gate status vocabulary ([642ba03](https://github.com/SpiceLabsHQ/Reaper/commit/642ba0396271158d2a4f52ff71956e6e3c544d13))
* **worktree-manager:** add lock detection and timeout CLI flags ([c50969c](https://github.com/SpiceLabsHQ/Reaper/commit/c50969c3a804c16664c68aac90a8abd76ee72ebe))


### Bug Fixes

* **agents:** address review findings for ai-prompt-engineer ([46ef856](https://github.com/SpiceLabsHQ/Reaper/commit/46ef856715fea8b8fc832ac7f44eddfb889eea55)), closes [#17](https://github.com/SpiceLabsHQ/Reaper/issues/17) [#8](https://github.com/SpiceLabsHQ/Reaper/issues/8)
* **agents:** resolve conflicting file-write instructions in ai-prompt-engineer ([1994902](https://github.com/SpiceLabsHQ/Reaper/commit/1994902cf622ae9b61838c1c790b957008b29b56)), closes [#13](https://github.com/SpiceLabsHQ/Reaper/issues/13)
* **ci:** resolve glob expansion failure and add coverage thresholds ([3c72f02](https://github.com/SpiceLabsHQ/Reaper/commit/3c72f02bc20960209218555e753faeabca013719))
* **docs:** correct coverage threshold to 70% in Contributing section ([f306929](https://github.com/SpiceLabsHQ/Reaper/commit/f30692972eba53094440cf09a1e51ed83c2bf858))
* **flight-plan:** replace plain-text approval with AskUserQuestion ([030f252](https://github.com/SpiceLabsHQ/Reaper/commit/030f252ab89d35d62dac2d511135ac2aef40c4a1))
* **huddle:** address prompt engineering audit findings ([943917d](https://github.com/SpiceLabsHQ/Reaper/commit/943917df162c97d0b1c4712e2d881ffc1e8e6de5))
* **prompts:** remove parent-child from ADD_DEPENDENCY semantics ([e4359e9](https://github.com/SpiceLabsHQ/Reaper/commit/e4359e9da68ecd286e7f7d87566f07e2d551bcbd))
* resolve 10 infrastructure, config, and documentation bugs ([f400d17](https://github.com/SpiceLabsHQ/Reaper/commit/f400d17cf0240b45ecd50add52ec86094198750c))
* resolve 9 template, command, and documentation bugs ([83dcb55](https://github.com/SpiceLabsHQ/Reaper/commit/83dcb55d7f4007934e8ea5feeeddb3645e211117))
* **takeoff:** handle multi-level task hierarchies in pre-planned detection ([fb7beee](https://github.com/SpiceLabsHQ/Reaper/commit/fb7beeea2e6f9feedbd9f75dacf5c2fe1cf33b7d))
* **test-runner:** enforce single-execution test protocol to prevent double runs ([8f37df4](https://github.com/SpiceLabsHQ/Reaper/commit/8f37df4eb6e61e24ae713c36fe0a9477de2c3cdb))
* **test:** consolidate all test suites lost in parallel merge ([8633ae9](https://github.com/SpiceLabsHQ/Reaper/commit/8633ae97f75bf680f46414b99984a11637e85073))
* **visual-vocab:** remove backtick-quoted !! that triggers bash permission checker ([56cb05b](https://github.com/SpiceLabsHQ/Reaper/commit/56cb05b4a06c3fa0c30a7b736ac77153ef6b2e18))
* **workflow-planner:** remove human-hour time estimates from sizing constraints ([9d7ee96](https://github.com/SpiceLabsHQ/Reaper/commit/9d7ee9619e52c13e4d51a49c783ab9fae8f0cd55))


### Refactoring

* **agents:** audit and optimize all 23 agent prompts for Claude Opus 4.5 ([6d277d1](https://github.com/SpiceLabsHQ/Reaper/commit/6d277d158423797ec1fb797fe6d9de63c483e897))
* **agents:** deduplicate ai-prompt-engineer against knowledge base ([d39bac6](https://github.com/SpiceLabsHQ/Reaper/commit/d39bac6d41791db1e135225c932d45ea8979eb6b))
* **agents:** pre-deploy polish for Reaper v1.7.0 ([556c2c8](https://github.com/SpiceLabsHQ/Reaper/commit/556c2c83767e4dafe12f093933cc359fc84ae989))
* **commands,agents:** rewrite orchestration templates with partials ([0335971](https://github.com/SpiceLabsHQ/Reaper/commit/03359713df36913b5ce1bed0cda8d61e1a8b3e09))
* **commands:** rename war-room to huddle ([f947459](https://github.com/SpiceLabsHQ/Reaper/commit/f94745922fa3daa2aefad21a5251dd4b8f1e77cd))
* **docs:** recategorize agents — Meta → Craft, validation-runner → Quality ([f82ac33](https://github.com/SpiceLabsHQ/Reaper/commit/f82ac33e3426511c518616a49c04ed8ded42aab4))
* extract SPICE standards and soften prescriptive language ([7a026b4](https://github.com/SpiceLabsHQ/Reaper/commit/7a026b4b26cf35eb0e5ace33dde2a44c25f377e5))
* **partials:** create 6 shared partials for orchestration pipeline ([269b7c1](https://github.com/SpiceLabsHQ/Reaper/commit/269b7c183e208abe635cd2fb4501cfaf670971c7))
* **partials:** harden orchestrator guardrails and quality gate validation ([36a8683](https://github.com/SpiceLabsHQ/Reaper/commit/36a868354c2918ff6dd253deb17567a9b0577852))
* **squadron:** optimize prompt quality and reduce token waste ([e9636bb](https://github.com/SpiceLabsHQ/Reaper/commit/e9636bbec157510b3f73d026258f5bc41dbd582b))
* **takeoff:** add structural loop anchors to prevent execution fall-through ([f911fdf](https://github.com/SpiceLabsHQ/Reaper/commit/f911fdf1ff0a3d90a61b7d75af1f4454082c1761))
* **takeoff:** strengthen completion guard with re-read protocol ([e3355a1](https://github.com/SpiceLabsHQ/Reaper/commit/e3355a12578572a9aeaccbf63970a00b8850468e))
* **visual-vocab:** rename GROUNDED gauge state to TAXIING ([#5](https://github.com/SpiceLabsHQ/Reaper/issues/5)) ([a791db9](https://github.com/SpiceLabsHQ/Reaper/commit/a791db9c4e88c211f07b10d884412a7915580114))


### Documentation

* add prompt engineering knowledge base for ai-prompt-engineer agent ([ab9d8d0](https://github.com/SpiceLabsHQ/Reaper/commit/ab9d8d051415f7e6dd776a8e0d6e2ae8bf93523e))
* add The Five Keys core values to CLAUDE.md ([d8e6225](https://github.com/SpiceLabsHQ/Reaper/commit/d8e6225dd924a5c19ad9f5af535c5ce6f1856feb))
* **claude:** add documentation maintenance requirements and docs/ to project structure ([84e5481](https://github.com/SpiceLabsHQ/Reaper/commit/84e54818bc7e512c406db7833b3f183134e06627))
* **claude:** add environment requirements and visual-vocabulary partial ([e2d24fc](https://github.com/SpiceLabsHQ/Reaper/commit/e2d24fc144a8bbf76538687fdaf59e92ef0b0430))
* **CLAUDE:** improve prompt quality based on ai-prompt-engineer audit ([547e20b](https://github.com/SpiceLabsHQ/Reaper/commit/547e20beb1dc29669341b08e8989c5fc7d304b75))
* **CLAUDE:** update coverage target to 70% with test infrastructure improvements ([2f0b5a6](https://github.com/SpiceLabsHQ/Reaper/commit/2f0b5a6165cbe71551affadac6ec23b2a874891b))
* **readme:** add kawaii banner and reorganize hero section ([2c571a6](https://github.com/SpiceLabsHQ/Reaper/commit/2c571a63428b8c0f41ee96459e6c07983f2491b8))
* **readme:** add usage sections and usage limit claim ([92c0bb2](https://github.com/SpiceLabsHQ/Reaper/commit/92c0bb2b8a584a9e58776d64c297382ec4579530))
* redesign README and create user-facing docs ([c76fe37](https://github.com/SpiceLabsHQ/Reaper/commit/c76fe373263f390e6ac5a0990a75917ba7aac7a5))
* reframe workflow entrypoints with flight-plan as default starting point ([a1b6d11](https://github.com/SpiceLabsHQ/Reaper/commit/a1b6d11b63a9981119d48ff04dde6b2bf632196b))
* remove docs/spice/ and update CLAUDE.md references ([1728ca8](https://github.com/SpiceLabsHQ/Reaper/commit/1728ca8c4b7b3be8805935c953f7ee5d3c55da5a))
* **start:** add /start documentation, tests, and contract coverage ([1c3c047](https://github.com/SpiceLabsHQ/Reaper/commit/1c3c0477bd096569ec76ae84d03a4e52b16af098))
* **worktree-manager:** document timeout, lock detection, and AI remediation ([6527cb1](https://github.com/SpiceLabsHQ/Reaper/commit/6527cb1961864311be3abc2781bb0f53adbded60))


### Styling

* **commands:** remove residual CRITICAL marker from flight-plan ([8dec67e](https://github.com/SpiceLabsHQ/Reaper/commit/8dec67e96c122905d4d8313e51d979944ede30df))


### Tests

* **build:** add compileTemplate and processFile integration tests ([b6085d5](https://github.com/SpiceLabsHQ/Reaper/commit/b6085d58819b3968d0a0e7f4a3fc7a8b6b1cb35a))
* **build:** add comprehensive parseFrontmatter unit tests ([1f085f1](https://github.com/SpiceLabsHQ/Reaper/commit/1f085f138f681e5d96bd5859d897cd32540a7096))
* **build:** add getAgentType and formatError unit tests ([4c500b5](https://github.com/SpiceLabsHQ/Reaper/commit/4c500b5cc198dbdee27b9a3e4fbda65da3eae1f1))
* **build:** add getAgentType and formatError unit tests ([903b774](https://github.com/SpiceLabsHQ/Reaper/commit/903b774485e293a5598dee42711d69ba9d3675f7))
* **build:** add parseArgs and commitlint beads-ref rule tests ([008a801](https://github.com/SpiceLabsHQ/Reaper/commit/008a8018493e647c4bd9fee76a4194aaca53a2f4))
* **contracts:** add structural contract validation for generated output ([9c70abb](https://github.com/SpiceLabsHQ/Reaper/commit/9c70abbd684eeebd4b270c3f1e9cb436dcc1f4c0))
* **contracts:** add visual vocabulary integration contracts ([a5d7f11](https://github.com/SpiceLabsHQ/Reaper/commit/a5d7f11a223df7e4b87353099f80c0e4d44bf221))
* **infra:** wire up node:test infrastructure with state isolation helpers ([c3541ec](https://github.com/SpiceLabsHQ/Reaper/commit/c3541ec0f6486d6907ef32a464e016a5a5afd103))
* **visual-vocabulary:** add Gate Panel isolation tests and update GAUGE_STATES constant ([a679dfb](https://github.com/SpiceLabsHQ/Reaper/commit/a679dfb7bf823707915564a173b2f3e910e342eb))

## [1.7.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.6.1...v1.7.0) (2026-01-24)


### Features

* **worktree-manager:** add timeout wrapper with AI remediation output ([6637d78](https://github.com/SpiceLabsHQ/Reaper/commit/6637d788e09fc41f6d4d283ab5960de5fa21bef5))


### Bug Fixes

* **commands:** prohibit EnterPlanMode in flight-plan command ([fbe2d08](https://github.com/SpiceLabsHQ/Reaper/commit/fbe2d088139f9ac047f2c040b68d33eefb9f18cc))

## [1.6.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.6.0...v1.6.1) (2026-01-23)


### Bug Fixes

* **commands:** add VERSION_BUMP=0 for pre-push hook ([d789721](https://github.com/SpiceLabsHQ/Reaper/commit/d7897211f8b3598f102e2ca512bd55a466c389c7))


### Refactoring

* **commands:** optimize release command for project workflow ([8cb0fd7](https://github.com/SpiceLabsHQ/Reaper/commit/8cb0fd7f98d0d4adc0278b01fd88d42ea88fd447))

## [1.6.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.3...v1.6.0) (2026-01-23)


### Features

* **commands:** add /release command for merging develop to beads-sync ([df6d6a3](https://github.com/SpiceLabsHQ/Reaper/commit/df6d6a3b858dd0c696474dd91198a951e3199674))
* **flight-plan:** enforce TDD methodology in work unit planning ([ebd5ced](https://github.com/SpiceLabsHQ/Reaper/commit/ebd5ced2b64c33bf0f2c75e0e8e6f396df112a01))


### Bug Fixes

* **commands:** use AskUserQuestion for release confirmation ([ead0b1c](https://github.com/SpiceLabsHQ/Reaper/commit/ead0b1c22f8be16411228d441c14d85c2f0184e6))
* **commands:** use main branch instead of beads-sync for releases ([f0daef9](https://github.com/SpiceLabsHQ/Reaper/commit/f0daef9e3e25443bd17e9a79fd6e7e3537bd756d))
* **worktree-manager:** restore missing shell scripts from EJS refactor ([6e156b2](https://github.com/SpiceLabsHQ/Reaper/commit/6e156b271d907526b14292dc5962501b4660cf48))


### Refactoring

* **agents:** use shared partials for consistent agent structure ([ab04fb6](https://github.com/SpiceLabsHQ/Reaper/commit/ab04fb6e2b82325df879f090a781365dd353ba3c))
* **flight-plan:** remove session tracking from plan output ([3bdc0e9](https://github.com/SpiceLabsHQ/Reaper/commit/3bdc0e9800031f4fc422eb40c560e9c34861a39d))
* **partials:** rewrite TDD testing protocol with testing philosophy ([55b82b0](https://github.com/SpiceLabsHQ/Reaper/commit/55b82b066923a3f52ad186e7bf7c6f4d531f207d))
* remove Spice skill and standardize doc paths to CLAUDE_PLUGIN_ROOT ([de641fc](https://github.com/SpiceLabsHQ/Reaper/commit/de641fc263aed74c28fdbf90adc748c9b694b024))


### Styling

* **flight-plan:** remove orphaned REPLACE update type definition ([10ae772](https://github.com/SpiceLabsHQ/Reaper/commit/10ae772f48eba499236c68034612fffcefc37232))

## [1.5.3](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.2...v1.5.3) (2026-01-18)


### Bug Fixes

* **commands:** use local project directory for flight-plan files ([cba0771](https://github.com/SpiceLabsHQ/Reaper/commit/cba07716189e09fe3af7cb55ec70796ce46ada96))

## [1.5.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.1...v1.5.2) (2026-01-18)


### Bug Fixes

* **commands:** remove plan mode tool calls from flight-plan ([4112fd8](https://github.com/SpiceLabsHQ/Reaper/commit/4112fd8c4bda619d3b7dc763cd55462e70fb0fae))

## [1.5.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.0...v1.5.1) (2026-01-18)

## [1.5.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.3.0...v1.5.0) (2026-01-18)


### Features

* **commands:** enhance takeoff & flight-plan commands ([dc317c0](https://github.com/SpiceLabsHQ/Reaper/commit/dc317c074413a129ee5b1feb49173098f1c9b041))
* **commands:** integrate native plan mode into flight-plan ([3c8bf5c](https://github.com/SpiceLabsHQ/Reaper/commit/3c8bf5c1dc76746a2435d7c9bf5943260637d64b))
* **skills:** convert commands to user-invocable skills ([851efd5](https://github.com/SpiceLabsHQ/Reaper/commit/851efd5a49cf1a87034f094fd5b8301af039ab7b))


### Bug Fixes

* **skills:** restructure user-invocable skills for proper discovery ([840fa39](https://github.com/SpiceLabsHQ/Reaper/commit/840fa39d5d3c7a5dab0533e4d537a530a7098d2f))
* **takeoff:** reinforce full-scope execution for pre-planned epics ([a9943d2](https://github.com/SpiceLabsHQ/Reaper/commit/a9943d21523649501c09dd4221095b5762663667))

## [1.3.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.2.0...v1.3.0) (2026-01-14)


### Features

* **build:** add EJS template build system for DRY plugin development ([e7c3031](https://github.com/SpiceLabsHQ/Reaper/commit/e7c303116a79ea98d43dbca07a50c6c942bff1a7))
* **worktree-manager:** require explicit branch disposition on cleanup ([e85ebfb](https://github.com/SpiceLabsHQ/Reaper/commit/e85ebfbaea10db48268c95ce89e1c9d6fa5c3378))


### Bug Fixes

* **hooks:** detect pushes TO main, not just FROM main ([93a9bc1](https://github.com/SpiceLabsHQ/Reaper/commit/93a9bc1821bc271769a54ae948117eb18948f5e0))
* **worktree-manager:** add CWD safety instructions for cleanup ([a07fc93](https://github.com/SpiceLabsHQ/Reaper/commit/a07fc931969411c003167307c615a718698f9314))


### Refactoring

* **agents:** standardize agent naming conventions ([8e69c7d](https://github.com/SpiceLabsHQ/Reaper/commit/8e69c7d4c5dd0d711bc82fcfdc15fa692a5b90ce))

## [1.2.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.2...v1.2.0) (2026-01-12)


### Features

* **agents:** add Stop hooks for orchestration flow ([40ad9c3](https://github.com/SpiceLabsHQ/Reaper/commit/40ad9c36fed8f1bd9ed55136b9659eccdb9bcfcc))


### Refactoring

* **agents:** slim down JSON output to essential fields ([dfb4afb](https://github.com/SpiceLabsHQ/Reaper/commit/dfb4afb9e389117c5156f6153101c48b0ab7d611))

## [1.1.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.1...v1.1.2) (2026-01-12)


### Refactoring

* **release:** simplify pre-push hook to gate-only pattern ([9d0d23e](https://github.com/SpiceLabsHQ/Reaper/commit/9d0d23ee541410522865f768e8249311c0a094b1))

## [1.1.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.0...v1.1.1) (2026-01-12)


### Bug Fixes

* **release:** simplify pre-push hook to avoid exit code confusion ([de2e5a7](https://github.com/SpiceLabsHQ/Reaper/commit/de2e5a786b704409ced5b64b08088a34118a75a2))

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
