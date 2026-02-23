# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.12.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.12.0...v1.12.1) (2026-02-23)


### Bug Fixes

* **config:** exempt CHANGELOG.md from Prettier formatting ([a26eb3d](https://github.com/SpiceLabsHQ/Reaper/commit/a26eb3d14cb37c63e7825b02d4be324453ba7008))
* **skill:** require --description on all bd create calls in issue-tracker-beads ([2a74c5f](https://github.com/SpiceLabsHQ/Reaper/commit/2a74c5f160215b5a19eeedc75b854c28eea7a2a0))

## [1.12.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.11.0...v1.12.0) (2026-02-23)

### Features

- **agents:** add dirty-root strategy escalation to workflow-planner and takeoff ([c6b31ed](https://github.com/SpiceLabsHQ/Reaper/commit/c6b31edec0f150900b80de84f24154936a8a9d3b))
- **agents:** add model frontmatter to specialist architect agents ([1018525](https://github.com/SpiceLabsHQ/Reaper/commit/10185257f7d6caca281cc9373b2bb369f2f25a23))
- **agents:** add principal-engineer agent ([af91a8f](https://github.com/SpiceLabsHQ/Reaper/commit/af91a8f61b10e5666a73369185cce8859ff51ef6))
- **agents:** add Skill tool to workflow-planner tools list ([85c4a27](https://github.com/SpiceLabsHQ/Reaper/commit/85c4a27463226d7d6bba3e5ff38ec53c6e2c49c8))
- **agents:** replace root-touching merge with isolated integration worktree in branch-manager ([bf4fae5](https://github.com/SpiceLabsHQ/Reaper/commit/bf4fae5da3d178d70acd6468a6e334ebd4dd1e78))
- **agents:** restrict branch-manager autonomous remediation with stop-and-report doctrine ([f0face0](https://github.com/SpiceLabsHQ/Reaper/commit/f0face009bcb2d7d8677ff05f2f4392075144f56)), closes [#8](https://github.com/SpiceLabsHQ/Reaper/issues/8) [-#11](https://github.com/SpiceLabsHQ/-/issues/11) [#7](https://github.com/SpiceLabsHQ/Reaper/issues/7)
- **agents:** simplify branch-manager as pure executor ([6aff548](https://github.com/SpiceLabsHQ/Reaper/commit/6aff54863ef06639f18c182e82b9e977e85c65d5))
- **agents:** wire pre-output-verification and blast-radius into coding agents ([31bbb4a](https://github.com/SpiceLabsHQ/Reaper/commit/31bbb4a2c70667af7b765189043426bc9c747be9))
- **build:** add Node 22+ engine requirement and build-time agent classification guard ([dec38ee](https://github.com/SpiceLabsHQ/Reaper/commit/dec38ee6eb2aadf961e05d11766749caf2774e68))
- **build:** add prompt size summary table to npm run build ([9e7d63c](https://github.com/SpiceLabsHQ/Reaper/commit/9e7d63c88cce883834e63e9fb36289c2091846fc))
- **commands,skills:** replace epic language with parent/child throughout ([2c56e5f](https://github.com/SpiceLabsHQ/Reaper/commit/2c56e5fa7f36c947310d625b8bd1efc8fa6e9f56))
- **commands:** add branch age to status-worktrees radar sweep ([5485e84](https://github.com/SpiceLabsHQ/Reaper/commit/5485e84364366b2434131dad1bd21f4a2817c57a))
- **commands:** add merge failure protocol to takeoff ([8a011bc](https://github.com/SpiceLabsHQ/Reaper/commit/8a011bc2d4cd9d590e4a6ae491efd6de4f12859d))
- **commands:** add mission banner to takeoff and flight-plan ([36e1486](https://github.com/SpiceLabsHQ/Reaper/commit/36e1486528ff11818f58525157604913143738c7))
- **commands:** add mission headers to ship and status-worktrees ([7a26364](https://github.com/SpiceLabsHQ/Reaper/commit/7a26364f820864bec6e984e41c21514d5afcc845))
- **commands:** add quality gate config check and configure-quality-gates command ([451b060](https://github.com/SpiceLabsHQ/Reaper/commit/451b06025e9c9d960d2d846f3f0dcc02032c2bbc))
- **commands:** add Reaper branding to claude-sync ([6be9aed](https://github.com/SpiceLabsHQ/Reaper/commit/6be9aed711772a8350448910206a42a901bb537f))
- **commands:** add Reaper branding to configure-quality-gates ([3f773c5](https://github.com/SpiceLabsHQ/Reaper/commit/3f773c5889ce035c2058f7047ca0491a865f4d78))
- **commands:** add user-comms-contract to all primary workflow commands ([655ca43](https://github.com/SpiceLabsHQ/Reaper/commit/655ca43cea78f6d9457f199b3b15b3a81948454a))
- **commands:** add visual vocabulary and completion cards to flight-plan ([80810a2](https://github.com/SpiceLabsHQ/Reaper/commit/80810a264eb100f187494e6705c7b1d2f13714db))
- **commands:** apply user-comms-contract to flight-plan and takeoff ([9061c8d](https://github.com/SpiceLabsHQ/Reaper/commit/9061c8d5a97082f0d2e22465b44bf4a374c55d97))
- **commands:** apply user-comms-contract to ship, start, and claude-sync ([c1101ab](https://github.com/SpiceLabsHQ/Reaper/commit/c1101ab69d2b2966deab5cbbfca16571956e4f8d))
- **commands:** apply user-comms-contract to status-worktrees and squadron ([d232c6c](https://github.com/SpiceLabsHQ/Reaper/commit/d232c6c4794f102efc44523c76ca02fd2260e834))
- **commands:** feature branch, issue lifecycle, and worktree cleanup for takeoff ([56f57ea](https://github.com/SpiceLabsHQ/Reaper/commit/56f57ea49930c96787dae023470ecccdcd37bd05))
- **commands:** invoke workflow-planner-planning skill from takeoff ([aa6c53b](https://github.com/SpiceLabsHQ/Reaper/commit/aa6c53b1fcb626da7a3b68beb0e6dad16bca0fd2))
- **commands:** invoke workflow-planner-verification skill from flight-plan ([e9bc793](https://github.com/SpiceLabsHQ/Reaper/commit/e9bc79326c75d2fb59845a2711b3f9d1d7e93f40)), closes [#3](https://github.com/SpiceLabsHQ/Reaper/issues/3)
- **commands:** refactor flight-plan Phase 6 to Task subagent dispatch ([e0584cd](https://github.com/SpiceLabsHQ/Reaper/commit/e0584cd594da4854d31ba520c4d0b18b06f1929f))
- **commands:** refactor takeoff Planning to Task subagent dispatch with resume ([7337cde](https://github.com/SpiceLabsHQ/Reaper/commit/7337cdef6beb2f5be7d2f8118428023038ec1b2b))
- **commands:** register configure-quality-gates in contracts and docs ([9cf6095](https://github.com/SpiceLabsHQ/Reaper/commit/9cf6095a2539c29e96914a2bb37eabfe59eded1d))
- **commands:** remove platform-specific hardcoding from flight-plan Phase 4+5 ([4fec443](https://github.com/SpiceLabsHQ/Reaper/commit/4fec443bcaf63e080199a01ef132f747e8a6ec19))
- **commands:** remove unconditional plan file writing from flight-plan ([a89056a](https://github.com/SpiceLabsHQ/Reaper/commit/a89056a82b730408c3c34a9559d49556a02c841c))
- **commands:** reuse branch-manager session across work units ([dc39dcc](https://github.com/SpiceLabsHQ/Reaper/commit/dc39dcc5e66b6f6137ad668fc712127a49bd256a))
- **commands:** surface /reaper:ship as PR option in takeoff completion ([82a01ec](https://github.com/SpiceLabsHQ/Reaper/commit/82a01ec2a67e1d75f1173311e420f70818d4428a))
- **flight-plan:** add ADR detection to planning phase ([b8dc444](https://github.com/SpiceLabsHQ/Reaper/commit/b8dc444be815fc97a50387ba3e4fd70456171020))
- **gates:** replace specialty-file injection with WORK_TYPE self-loading ([784dc1f](https://github.com/SpiceLabsHQ/Reaper/commit/784dc1f56d7ab0dede6b26619c022cb6619d8503))
- **gates:** wire principal-engineer into SME routing for api, infra, and architecture review ([bc71d51](https://github.com/SpiceLabsHQ/Reaper/commit/bc71d51c861ab002d931cf9aa3590bba45d08552))
- **lint:** install ESLint with flat config and fix all violations ([2c2b484](https://github.com/SpiceLabsHQ/Reaper/commit/2c2b484a7aa24513f17651578f135d1775fba5ed))
- **lint:** install Prettier with eslint-config-prettier integration ([bda2327](https://github.com/SpiceLabsHQ/Reaper/commit/bda2327c1b306f74cbd3265994a641f2a9b97a96))
- **lint:** wire npm run lint into pre-commit hook and quality gate ([f52bcd8](https://github.com/SpiceLabsHQ/Reaper/commit/f52bcd865788ec05929ab28b2dec1dd2e9afd2cb))
- **orchestration:** wire SME routing and materialize PLAN_CONTEXT in gate dispatch ([40e42d4](https://github.com/SpiceLabsHQ/Reaper/commit/40e42d483896b8cca01a5b4078ba53295cf042c3))
- **partials:** add mission-header partial for branded session header ([f4bdebc](https://github.com/SpiceLabsHQ/Reaper/commit/f4bdebc84cc3caed2f29c04238a2045336ddb17f))
- **partials:** add pre-output-verification grounding constraint ([7e43638](https://github.com/SpiceLabsHQ/Reaper/commit/7e43638834e393557c36663671563848cded1d2d))
- **partials:** add user-comms-contract partial and RED-phase tests ([535da98](https://github.com/SpiceLabsHQ/Reaper/commit/535da98745048df470c6f09d8b03d93a7032594d))
- **partials:** align commit policy and medium-worktree model across agents ([99deb7d](https://github.com/SpiceLabsHQ/Reaper/commit/99deb7d77b9e9f6744748081809011c2ed935521))
- **partials:** align no-commits-policy and orchestrator-role-boundary with per-unit commit flow ([f81e753](https://github.com/SpiceLabsHQ/Reaper/commit/f81e75374b6df947d55839f4bf96617a474ae50c))
- **partials:** move commit authority from gate protocol to takeoff per-unit cycle ([2db3172](https://github.com/SpiceLabsHQ/Reaper/commit/2db31727d0495f143c9ab31f68475ff6536c5f60))
- **reaper-e3q1:** implement rebase-first commit strategy with tree-depth heuristic ([978842b](https://github.com/SpiceLabsHQ/Reaper/commit/978842b6aedc27b815bfe75d058fc76479714031))
- **release:** add version-consistency verifier and agent misconfiguration sentinel ([2ff0f06](https://github.com/SpiceLabsHQ/Reaper/commit/2ff0f06c5b9b1176fdb4ec4a3afa99755b95f9b5))
- **ship:** add actionable next steps to already-shipped message ([82657cb](https://github.com/SpiceLabsHQ/Reaper/commit/82657cb97a33d7d279f338543928978246830115))
- **skills:** add issue-tracker skills for github, beads, jira, planfile ([f2cd83b](https://github.com/SpiceLabsHQ/Reaper/commit/f2cd83bead13aad16c139d74237d703ceaa02ea5))
- **skills:** add plan file creation to issue-tracker-planfile CREATE_ISSUE ([78204bb](https://github.com/SpiceLabsHQ/Reaper/commit/78204bb1cfae034d83d30eff4aa7f31e57fc4b23))
- **skills:** add specialty review files for code-review skill ([01a818e](https://github.com/SpiceLabsHQ/Reaper/commit/01a818e4e6fdc2efdacf87e889219087359fc6ef))
- **skills:** add universal code-review skill gate protocol ([959e3e3](https://github.com/SpiceLabsHQ/Reaper/commit/959e3e38dba2b9ac01570928c690fa67d5ce97d2))
- **skills:** add workflow-planner-planning skill ([243bf48](https://github.com/SpiceLabsHQ/Reaper/commit/243bf48b1c828a0866dba90cb1091cd4769a10cb))
- **skills:** add workflow-planner-verification skill ([37c3899](https://github.com/SpiceLabsHQ/Reaper/commit/37c3899f8f21d4080db8d3878f4686cd22662e08))
- **skills:** enforce detection-signal in agent-prompt code review ([26f5c46](https://github.com/SpiceLabsHQ/Reaper/commit/26f5c46fedeb6eb32a75e291fc3ecd3dc7ec09f3))
- **skills:** move scripts to src/ for build-generated output ([ce5920f](https://github.com/SpiceLabsHQ/Reaper/commit/ce5920f952b93f02ef4aaa66b7aeb5bc2458fb7d))

### Bug Fixes

- **agents:** prevent TDD phase splitting across work units ([fab5acc](https://github.com/SpiceLabsHQ/Reaper/commit/fab5acc3ac969dd48040255d1f8a27b1cc5ea81a)), closes [#5](https://github.com/SpiceLabsHQ/Reaper/issues/5)
- **agents:** remove bloat and fix validation in test-runner ([e95bc92](https://github.com/SpiceLabsHQ/Reaper/commit/e95bc92bfbbe32c7fbce23d82f6ed711c63a734c))
- **agents:** remove git reset --mixed HEAD and add root-cleanliness assertions to branch-manager ([9be226a](https://github.com/SpiceLabsHQ/Reaper/commit/9be226af9c0931bb510fd46c3e89c999af3fc79d)), closes [#11](https://github.com/SpiceLabsHQ/Reaper/issues/11)
- **agents:** sync root working tree index after integration merge ([d10fd21](https://github.com/SpiceLabsHQ/Reaper/commit/d10fd21ae2f4d1db92ea19e79d81a373110a8364))
- **agents:** use --ff-only from root when on target branch to prevent index staleness ([bf6830e](https://github.com/SpiceLabsHQ/Reaper/commit/bf6830e3a123e72a6990e4af3c50ed5597936a72))
- **commands:** replace PLAN_CONTEXT materialization with lightweight ref ([f1ad221](https://github.com/SpiceLabsHQ/Reaper/commit/f1ad22156e0d33a3eb0e74e0863f780aa19e30ef))
- **commands:** tighten start skill description to prevent over-triggering ([a667f7c](https://github.com/SpiceLabsHQ/Reaper/commit/a667f7c422911254fa0c7c9f0db59b04e4bfb642))
- **contracts:** remove stale Plan File requirement from flight-plan contract ([0b541bc](https://github.com/SpiceLabsHQ/Reaper/commit/0b541bc2b74211858e9ee8e460fcea463d183e1e))
- **flight-plan:** clarify takeoff command uses all top-level issue IDs ([43ab7ee](https://github.com/SpiceLabsHQ/Reaper/commit/43ab7eebae9e485004187b68196c47c32f15e87a))
- **flight-plan:** replace LANDED with FILED, move next steps below card ([17725ae](https://github.com/SpiceLabsHQ/Reaper/commit/17725aeb9a2899e010770c3839cd122914d2c3e8))
- **flight-plan:** replace TAXIING with AWAITING CLEARANCE on Briefing Card ([71d1be7](https://github.com/SpiceLabsHQ/Reaper/commit/71d1be7536e5e2e33474c0baed82536cd69fd2f4))
- **flight-plan:** use structural parent-reference exclusion in closing output ([09ff17e](https://github.com/SpiceLabsHQ/Reaper/commit/09ff17e0408b89dd4c828d30443607995067083a))
- **gates:** correct test_code and configuration reviewer_agent in docs ([255a880](https://github.com/SpiceLabsHQ/Reaper/commit/255a880d705427fae043d2feb922f79bf220562b))
- **gates:** route Gate 2 work types to correct SME agents ([d654bed](https://github.com/SpiceLabsHQ/Reaper/commit/d654bedbcd811698105dbe7d91567487ce5a1a22))
- **hooks:** add prettier pass to pre-commit to prevent working tree drift ([bd1cd7f](https://github.com/SpiceLabsHQ/Reaper/commit/bd1cd7f887fa3bcb72fc63c5903563b75f8bdb0f))
- **hooks:** guard against empty CLAUDE_FILE_PATH in formatter hook ([a081ff2](https://github.com/SpiceLabsHQ/Reaper/commit/a081ff2422f6d8a915446b5576a88c899712ce57))
- **hooks:** remove prettier pass on generated output dirs ([02e1127](https://github.com/SpiceLabsHQ/Reaper/commit/02e11279900f3c7ed9dfd57ec729965c8dd4324f))
- **hooks:** scope pre-commit formatter to staged files only ([e7d8f36](https://github.com/SpiceLabsHQ/Reaper/commit/e7d8f36d82dcf5b618ae7b33bc4250dcb1c13682))
- **partials:** prohibit EnterPlanMode in orchestrator role boundary ([d20ee9e](https://github.com/SpiceLabsHQ/Reaper/commit/d20ee9e2d5d24d0cebc650592dd3249e2ffd1492))
- **partials:** update pre-work-validation-review for lightweight PLAN_CONTEXT ([66e8158](https://github.com/SpiceLabsHQ/Reaper/commit/66e81586dfe4bcea59ac2d42722d50ee6a65ef08))
- **release:** add git tag alignment check to release sentinel ([0111008](https://github.com/SpiceLabsHQ/Reaper/commit/0111008bb83495de01a3e0a5adb97fb0ad9cd5a4))
- **skills:** add sub-issue fallback guidance and document pagination limit ([47787ce](https://github.com/SpiceLabsHQ/Reaper/commit/47787ce67d3628e8072e088f48b62bf88f48a25f))
- **skills:** address squadron review findings ([d19addd](https://github.com/SpiceLabsHQ/Reaper/commit/d19adddda68b11babeb1076bef48b218e42faf02))
- **skills:** apply review feedback — output contract, XML tags, full ref sweep ([54b2dd5](https://github.com/SpiceLabsHQ/Reaper/commit/54b2dd510b134bdc28bd6afa173adaa38e22dc8a))
- **test-helpers:** add agentTokenCounts reset to resetBuildState() ([342128d](https://github.com/SpiceLabsHQ/Reaper/commit/342128da7e71152af7af9dcc78413a29fd3113a8))

### Refactoring

- **agents:** remove deferral table and scope-limiting language ([1441f06](https://github.com/SpiceLabsHQ/Reaper/commit/1441f06e4d6a3fa42586908f2adfe344079d7600))
- **agents:** remove GATE_MODE conditional blocks and update docs ([2fd0cca](https://github.com/SpiceLabsHQ/Reaper/commit/2fd0ccab6e798000d85e7fc531503337a17b0846))
- **agents:** rewrite Protocol [#8](https://github.com/SpiceLabsHQ/Reaper/issues/8) as positive hook-respect instruction ([2b28b38](https://github.com/SpiceLabsHQ/Reaper/commit/2b28b38e28e3f3e70e0f1c47e2c6d7e60f57293f))
- **agents:** strip workflow-planner to general knowledge + routing ([eee6fa6](https://github.com/SpiceLabsHQ/Reaper/commit/eee6fa6c02a3fde2ab3af05b73a41b313f392704))
- **build:** remove GATE_CAPABLE_AGENTS, bridge gateCapable to false ([824e8ec](https://github.com/SpiceLabsHQ/Reaper/commit/824e8ec8c7940cd849ec9b4bdadca934b5fb55b4))
- **commands:** invoke /reaper:ship directly instead of instructing user ([8d4ab1c](https://github.com/SpiceLabsHQ/Reaper/commit/8d4ab1c59a03a3576f1f48b43418c8b7439c5a60))
- **commands:** rewrite Phase 1.5 to use context-gap assessment ([cd632e8](https://github.com/SpiceLabsHQ/Reaper/commit/cd632e8617fbd141463d344d11343818782178e2))
- **commands:** route consumers to issue-tracker skills ([ac878e9](https://github.com/SpiceLabsHQ/Reaper/commit/ac878e96431af56a2afa71f5616d269333067367))
- **gates:** replace SME reviewer alias with direct agent names in gate profile table ([4452fb4](https://github.com/SpiceLabsHQ/Reaper/commit/4452fb4a933462b8e3cf93a2ba2c9efe681ceeec))
- **partials:** remove dead writer branch from plan-file-schema ([80ce850](https://github.com/SpiceLabsHQ/Reaper/commit/80ce85073d61363cd59e8cb9c595177ef1f4e891))
- **partials:** slim down task-system-operations to commit-only detection ([67da89a](https://github.com/SpiceLabsHQ/Reaper/commit/67da89a00195f799a2cdb479a0e93bbdc3cd7da9))
- **schema:** simplify plan-file schema to ephemeral model ([2cd9303](https://github.com/SpiceLabsHQ/Reaper/commit/2cd93038f4c8b06bb76928be112a91bc8686674d))
- **skills:** extract GitHub sub-issue operations into bundled scripts ([fefbe18](https://github.com/SpiceLabsHQ/Reaper/commit/fefbe18b003a5fef61ea2b2ba1330ed461400d8d))
- **skills:** improve prompt precision from ai-prompt-engineer audit ([1d52edf](https://github.com/SpiceLabsHQ/Reaper/commit/1d52edf5eddeea84d387e186a2ad4bc867565e5c))

### Documentation

- **adr:** add ADR-0012 agent context self-service ([f6b146d](https://github.com/SpiceLabsHQ/Reaper/commit/f6b146d03399993b28dbbc69e5ec5b5d6f3c6f29))
- **adr:** add ADR-0013 orchestrator owns commit/merge authority ([8256568](https://github.com/SpiceLabsHQ/Reaper/commit/8256568a302c0a69b14681cb429b4084f47fec99))
- **adr:** add ADR-0014 for isolated merge worktree pattern in branch-manager ([fd75fdb](https://github.com/SpiceLabsHQ/Reaper/commit/fd75fdb43a72410a44b8e974e4e3546f3f2a4315))
- **adr:** add ADR-0015 workflow-planner process extraction ([fc19bf3](https://github.com/SpiceLabsHQ/Reaper/commit/fc19bf36435123e8194f4bf8bed786a6b3d71c3f))
- **adr:** add ADR-0016 agent tier design standard ([33b644b](https://github.com/SpiceLabsHQ/Reaper/commit/33b644b25396dcbe3b2d5553369561d7cd2c3abe))
- **adr:** add ADR-0017 workflow-planner Task dispatch pattern ([4aaa500](https://github.com/SpiceLabsHQ/Reaper/commit/4aaa5003e08d77804be0ae9e16c00a68479d6669))
- **adr:** add ADR-0018 build-time prompt size reporting ([d9c0fe4](https://github.com/SpiceLabsHQ/Reaper/commit/d9c0fe49750267469ab1a69f7094b601443ce890))
- **adr:** add ADR-0019 cross-reference to ADR-0014 merge pattern ([8ca1019](https://github.com/SpiceLabsHQ/Reaper/commit/8ca1019a6b10e76a32ba029ac4e6492a2ac6b4ed))
- **adr:** add ADR-0019 post-merge root-cleanliness assertion ([b758d6a](https://github.com/SpiceLabsHQ/Reaper/commit/b758d6a1441d583a69c6f1c65af60d1102292a60)), closes [#11](https://github.com/SpiceLabsHQ/Reaper/issues/11)
- **adr:** add ADRs 0005-0010 for core architectural decisions ([a141f8a](https://github.com/SpiceLabsHQ/Reaper/commit/a141f8ab1b2f9b3d0cfc5f15d520d5de2311b0c1))
- **adr:** establish ADR-0001 for code-review skill with SME routing ([d71af4d](https://github.com/SpiceLabsHQ/Reaper/commit/d71af4d2f7f257192c8566d758bfc0176433aedb))
- **adr:** establish ADR-0002 for SME agents as pure domain experts ([fb3d776](https://github.com/SpiceLabsHQ/Reaper/commit/fb3d77633d194ebb105dc93cb54efbf7fa26d19d))
- **adr:** establish ADR-0003 for semantic tool naming convention ([d00cb7a](https://github.com/SpiceLabsHQ/Reaper/commit/d00cb7a3a18388304c5f9385eee2e7aa752dae25))
- **adr:** establish ADR-0004 for description as invocation contract ([2b509c6](https://github.com/SpiceLabsHQ/Reaper/commit/2b509c67d55b063c182b348f328cd2a4ae9c2b5a))
- **adr:** establish orchestrate scripts as orchestrator-only channel ([fe53090](https://github.com/SpiceLabsHQ/Reaper/commit/fe530903e34d64ab24ca8cf827b9d277d1dca7b3))
- **agents:** add tier-based agent design standard ([756ee0d](https://github.com/SpiceLabsHQ/Reaper/commit/756ee0d3b2cd5d820d142db4add5ad5767f06fa0))
- **agents:** register principal-engineer in docs and CLAUDE.md ([01c055c](https://github.com/SpiceLabsHQ/Reaper/commit/01c055c2c47382fdc442ffd1bbf3517522b2384b))
- **commands:** document Reaper: disable ASCII art opt-out ([e421424](https://github.com/SpiceLabsHQ/Reaper/commit/e42142483381bdc4a867f365a0260e9919a1a296))
- **issue-tracker-github:** add PR safety rule requiring user confirmation ([6c4e5bf](https://github.com/SpiceLabsHQ/Reaper/commit/6c4e5bf000f2e0c9b94964e7aa8442b4a6d25690))
- **readme:** add parallel development guide ([efb72ff](https://github.com/SpiceLabsHQ/Reaper/commit/efb72fff369865b8c6ffa548afa5b2d92075775b))
- **readme:** correct VS Code worktree navigation guidance ([aa0d529](https://github.com/SpiceLabsHQ/Reaper/commit/aa0d5299645a570c81063aa3af500ff67839b634))
- **readme:** update Skills, Commands, and Contributing sections ([a50ddfc](https://github.com/SpiceLabsHQ/Reaper/commit/a50ddfcea40c7e4a91cf39596548b7bb4e2b7935))
- **skills:** create skills.md reference and update README ([8afd64e](https://github.com/SpiceLabsHQ/Reaper/commit/8afd64e307fe74e4685a3eacbefe75393fb69245))
- **skills:** fix issue tracker detection order description ([9c3984a](https://github.com/SpiceLabsHQ/Reaper/commit/9c3984a151e43aee4d0cae657e63b783b33be375))
- **workflow:** update for ADR-0015 skill extraction ([a647053](https://github.com/SpiceLabsHQ/Reaper/commit/a647053fdaafe2695d8b96b8a5b30e0a4af4f218))

### Tests

- **contracts:** add ADR-0012 regression assertions ([561772b](https://github.com/SpiceLabsHQ/Reaper/commit/561772bac0b1251ee94f3048b45894415c2d0949))
- **contracts:** add assertions for per-unit commit step and removal of dual-auth content ([4806d66](https://github.com/SpiceLabsHQ/Reaper/commit/4806d667f3f12dbb0745dd07bfec2eeb7d5ae0ea))
- **contracts:** add contract tests for branch-manager merge conflict stop-and-report ([d82d54a](https://github.com/SpiceLabsHQ/Reaper/commit/d82d54aa317b93bf9dd3c8c056384a4ca421a5f8))
- **contracts:** add dirty-root strategy escalation contract tests ([2a587c5](https://github.com/SpiceLabsHQ/Reaper/commit/2a587c518cad97297fee016c6289843c20e184e7))
- **contracts:** add flight-plan no-planfile-write contract [red] ([9d5754e](https://github.com/SpiceLabsHQ/Reaper/commit/9d5754e76e285d6b1fc52bfdc03c341603a488a8))
- **contracts:** add Gate 2 partial failure contract test ([ccf36ef](https://github.com/SpiceLabsHQ/Reaper/commit/ccf36efed02036df780328d0dba7e702135ff1cb))
- **contracts:** add mission banner contract tests for takeoff and flight-plan ([e1a1d4d](https://github.com/SpiceLabsHQ/Reaper/commit/e1a1d4d272b3fb1f7d8fe79f8790a5799d67cb76))
- **contracts:** add pre-output-verification and blast-radius contract tests ([95353b7](https://github.com/SpiceLabsHQ/Reaper/commit/95353b7801ed1d8a9072fe6a2ffa3e1512a890a5))
- **contracts:** add regression tests for flight-plan abstraction boundary (RED) ([98abd5e](https://github.com/SpiceLabsHQ/Reaper/commit/98abd5ef9e5f56ccca21a7651fc4150558781a97))
- **contracts:** add union semantics 3-work-type deduplication contract test ([4c1454a](https://github.com/SpiceLabsHQ/Reaper/commit/4c1454a5c39bdab13b783565f6d139d3c5cee1d1))
- **contracts:** remove feature-developer from VALID_GATE2_AGENTS ([cb2be1e](https://github.com/SpiceLabsHQ/Reaper/commit/cb2be1e06de67debc728dda1752e569a74d00bd8))
- **hooks:** add guard regression tests for formatter hook ([7dbc5e3](https://github.com/SpiceLabsHQ/Reaper/commit/7dbc5e34096c82cd5d66465afe2b6273db94ecd3))

## [1.11.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.10.0...v1.11.0) (2026-02-16)

### Features

- **agents:** consolidate agent colors to 3-color standard ([7a30594](https://github.com/SpiceLabsHQ/Reaper/commit/7a30594ae4df88c435cc9d68d17e716b5cf105cc))
- **commands:** integrate work-unit-cleanup partial into orchestrator commands ([ea2d73f](https://github.com/SpiceLabsHQ/Reaper/commit/ea2d73f15524e1c8c1a257606fa46b655f416e11))
- **detection:** replace naive task system detection with 3-layer chain ([d56d4bc](https://github.com/SpiceLabsHQ/Reaper/commit/d56d4bc7c8c4d5b59ed212c6168d067ba37e4e3d))
- **partials:** add work-unit-cleanup behavioral instruction partial ([fd719ac](https://github.com/SpiceLabsHQ/Reaper/commit/fd719ac6b79e6ca348b75af4e74f36090b6e084d))
- work unit cleanup protocol for orchestrator commands ([92c76aa](https://github.com/SpiceLabsHQ/Reaper/commit/92c76aa109d1dd708feac801ceb39d8a2001a240))
- **worktree-manager:** add shared visual helpers library ([6c10022](https://github.com/SpiceLabsHQ/Reaper/commit/6c100220c9ee58dcfe3721f21da661556d6882b9))
- **worktree-manager:** migrate scripts to visual-helpers library ([971c446](https://github.com/SpiceLabsHQ/Reaper/commit/971c44658c588e5ca190127425d066db9422c5aa))

### Refactoring

- **agents:** remove validation-runner from build and gate protocol ([3799e67](https://github.com/SpiceLabsHQ/Reaper/commit/3799e67ea60003b3624247cc0e5384ad951be669))

### Documentation

- add work-unit-cleanup partial to CLAUDE.md partials reference ([555d0fc](https://github.com/SpiceLabsHQ/Reaper/commit/555d0fc1ef6966c4ff10376f817c763eda19a3bb))
- remove validation-runner from all documentation ([577041e](https://github.com/SpiceLabsHQ/Reaper/commit/577041e5eef8876d551a15ef7db0ef4130a3a8cc))

## [1.10.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.9.1...v1.10.0) (2026-02-09)

### Features

- **release:** auto-update shields.io version badge on release ([adc5c7a](https://github.com/SpiceLabsHQ/Reaper/commit/adc5c7a5bfe60f4be8afa93971c506d420d7b588))

## [1.9.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.9.0...v1.9.1) (2026-02-09)

### Bug Fixes

- **commands:** add git-flow back-merge to release workflow ([8e8d634](https://github.com/SpiceLabsHQ/Reaper/commit/8e8d6343c49f4ac3f184a702aea47e07f892dd1f))
- **commands:** compress subagent I/O to prevent takeoff context exhaustion ([2b2cb5e](https://github.com/SpiceLabsHQ/Reaper/commit/2b2cb5e3e2aabd38327c7571087e9c5c971252b1))

## [1.9.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.2...v1.9.0) (2026-02-09)

### Features

- **commands:** integrate TAKING OFF into takeoff and status-worktrees ([7b37646](https://github.com/SpiceLabsHQ/Reaper/commit/7b376468d3ebed80e72daeacc80cd937a43be32d))
- **strategy:** add single-document de-escalation override ([b726382](https://github.com/SpiceLabsHQ/Reaper/commit/b726382c4819b80327b9a8d9b13deb1b8a28cc37))
- **visual-vocab:** add TAKING OFF gauge state ([3365951](https://github.com/SpiceLabsHQ/Reaper/commit/336595138e7af9f98aa1b6b50dbfce8e56a4fed1))

### Bug Fixes

- **commands:** replace Five Keys scorecard with Design Quality in squadron ([2cb0bc3](https://github.com/SpiceLabsHQ/Reaper/commit/2cb0bc3f85fbcc24fc3af865f3487b8da3c94951))
- **flight-plan:** reinforce hierarchy vs dependency distinction in Phase 5 ([c693ff0](https://github.com/SpiceLabsHQ/Reaper/commit/c693ff06820c13351481099b9b80eae06f70c386))
- **partials:** strengthen hierarchy vs dependency guidance in task-system-operations ([df71947](https://github.com/SpiceLabsHQ/Reaper/commit/df719475238fc2b4193410f7d1da21f8b131250b))
- **workflow-planner:** remove parent-child from dependency type table ([e40d1cf](https://github.com/SpiceLabsHQ/Reaper/commit/e40d1cf195f99515bed6c87345e6ad1a583bd8b4))

### Tests

- **squadron:** add scope boundary contract and update test rationale ([7ac9c25](https://github.com/SpiceLabsHQ/Reaper/commit/7ac9c254011920d6774eac54cdcb5a215d625b17))

## [1.8.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.1...v1.8.2) (2026-02-08)

### Documentation

- **claude:** add scope boundary for Reaper-specific guidance ([21013f8](https://github.com/SpiceLabsHQ/Reaper/commit/21013f856eb8d028e0d5011b80a1c5eb90138d9d))

## [1.8.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.8.0...v1.8.1) (2026-02-08)

### Bug Fixes

- **build:** regenerate start.md with ON APPROACH gauge state ([6dc2229](https://github.com/SpiceLabsHQ/Reaper/commit/6dc22296d3fc8fe0e0509b0c676abbc1dd656f33))

## [1.8.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.7.0...v1.8.0) (2026-02-08)

### Features

- add formatter allowlist, build.js error handling, explore-first docs ([17756f7](https://github.com/SpiceLabsHQ/Reaper/commit/17756f7cdd86f33a2db0c81190dcb24ebaeaf46e))
- **agents:** add 6 new planning agents for war room expert panel ([aca39db](https://github.com/SpiceLabsHQ/Reaper/commit/aca39dbf2b34ef115278f9dd985a1efd8207fc24))
- **agents:** add 6 planning agents for war room expert panel expansion ([b6b1ba4](https://github.com/SpiceLabsHQ/Reaper/commit/b6b1ba4347e5d38b7be8a982a32aa2d43152146c))
- **agents:** add ai-prompt-engineer agent ([2ee31d2](https://github.com/SpiceLabsHQ/Reaper/commit/2ee31d26e90d8b9bd389afd6bd13b4402020356d))
- **agents:** add multi-model prompt engineering guidance ([9af6500](https://github.com/SpiceLabsHQ/Reaper/commit/9af6500dbfaceb3c1e1a2e44a261f61250e53d5f))
- **commands:** add command contracts, ship scan patterns, coverage thresholds ([ede90ac](https://github.com/SpiceLabsHQ/Reaper/commit/ede90acd1ba1b8037594f99cfa06d035cbe970a0))
- **commands:** add war-room collaborative design session command ([269e0f7](https://github.com/SpiceLabsHQ/Reaper/commit/269e0f743cbb4363b77dde659be71c0ccc782efc))
- **commands:** re-theme huddle command to squadron ([f6fd593](https://github.com/SpiceLabsHQ/Reaper/commit/f6fd593b4c3d028213b260ca21029986da746489))
- **commands:** update Gate Panel to use gate statuses and add ON APPROACH to commands ([bf65a15](https://github.com/SpiceLabsHQ/Reaper/commit/bf65a15fd91a30c8dc67552a678b1939f9f6cc8a))
- **huddle:** redesign skill with 4-phase INTAKE/OPEN/CLASH/CONVERGE flow ([349ad6a](https://github.com/SpiceLabsHQ/Reaper/commit/349ad6a777a69c0d144ddddd8817765a1edbee79))
- **partials:** add visual-vocabulary.ejs with gauge states and card templates ([591df62](https://github.com/SpiceLabsHQ/Reaper/commit/591df62946a5dc85939a9c3deb6db00540ff0bd0))
- **quality-gates:** add gate infrastructure (U2, U3, U5, U11) ([75ddb35](https://github.com/SpiceLabsHQ/Reaper/commit/75ddb3554e51e6e587b2c21186ed61df8568afef))
- **quality-gates:** add GATE_MODE sections to 4 agents (U6-U9) ([f77513c](https://github.com/SpiceLabsHQ/Reaper/commit/f77513c7bcdb37da610f6ebc5e043d5034ead9a7))
- **quality-gates:** add work-type-aware gate profile system ([f3e793f](https://github.com/SpiceLabsHQ/Reaper/commit/f3e793f95f6426ab0916d2660351dc9493e0b297))
- **quality-gates:** create validation-runner agent template (U4) ([7cc8707](https://github.com/SpiceLabsHQ/Reaper/commit/7cc8707e60fc2d0bf35ee5dd520ec031493a9d3a))
- **quality-gates:** dynamic gate selection in takeoff orchestrator (U10) ([e5d9c3a](https://github.com/SpiceLabsHQ/Reaper/commit/e5d9c3ad51621586f6bdf20877243947e12ecf01))
- **quality-gates:** gate expectations and work_type field (U12, U13) ([e18bf47](https://github.com/SpiceLabsHQ/Reaper/commit/e18bf4770c5b982886ef86687925f47ef0ff9bc8))
- **quality:** add semantic contract tests, CI fix, docs accuracy, and context hygiene ([0cba1fb](https://github.com/SpiceLabsHQ/Reaper/commit/0cba1fb04026379133ff37ea79e8445340a93ab1))
- **security-auditor:** add timeout protection for scanning tools ([032c916](https://github.com/SpiceLabsHQ/Reaper/commit/032c9161a2c3c73acc5d576b7e8f9d2a8ad3787c))
- separate gauge states and quality gate vocabulary with ON APPROACH state ([6b6f20a](https://github.com/SpiceLabsHQ/Reaper/commit/6b6f20a56b6a79598d366d13209ad74b47a208ff))
- **ship:** add departure and landing cards with pipeline gauges ([14df16b](https://github.com/SpiceLabsHQ/Reaper/commit/14df16b4e917463b97d2710d4d795d403652051c))
- **squadron:** add stance summaries contract tests ([f9e36c9](https://github.com/SpiceLabsHQ/Reaper/commit/f9e36c9bd74ae232eede1a200b5be5e3640cf96b))
- **squadron:** integrate shared gauge vocabulary from visual-vocabulary partial ([8407a5c](https://github.com/SpiceLabsHQ/Reaper/commit/8407a5c5520504db9698b165dc6ab84544eba4e2))
- **squadron:** overhaul UX with visual vocabulary, editorial voice, and narrator-driven flow ([38771c3](https://github.com/SpiceLabsHQ/Reaper/commit/38771c354941c153a0413b1b82ff746900097835))
- **squadron:** replace scout-then-swarm with explore-first architecture ([cbce770](https://github.com/SpiceLabsHQ/Reaper/commit/cbce7702434ac61f1ef7e1e710837f5bc1ac31fb))
- **squadron:** ux overhaul with visual vocabulary and editorial voice ([d35ff2b](https://github.com/SpiceLabsHQ/Reaper/commit/d35ff2b8573add272f4cf353ab0ee282246bb26e))
- **start:** add /reaper:start educational entry-point command ([a22b9f5](https://github.com/SpiceLabsHQ/Reaper/commit/a22b9f59f267de2bf6efc3e1fbe7aeaa09797eb3))
- **status-worktrees:** transform summary into fleet dashboard ([cd4657d](https://github.com/SpiceLabsHQ/Reaper/commit/cd4657d2d82908a483dd02cb95e42c2533dfe9c6))
- **takeoff:** add iteration loop, file reading allowlist, and Quick Reference fix ([985d4c7](https://github.com/SpiceLabsHQ/Reaper/commit/985d4c7c66723062ea1ba28e29f495b26786b3c7))
- **takeoff:** add preflight card, gate panel, and touchdown card ([aa104f3](https://github.com/SpiceLabsHQ/Reaper/commit/aa104f3bee0cfe51f405d0358364f0d9d71fb5a6))
- **test-runner:** background task pattern with timeout polling for full suite runs ([895f7ba](https://github.com/SpiceLabsHQ/Reaper/commit/895f7ba7c4c52969588bbfd9641aa048e874acf7))
- **visual-vocabulary:** add ON APPROACH gauge state and quality gate status vocabulary ([642ba03](https://github.com/SpiceLabsHQ/Reaper/commit/642ba0396271158d2a4f52ff71956e6e3c544d13))
- **worktree-manager:** add lock detection and timeout CLI flags ([c50969c](https://github.com/SpiceLabsHQ/Reaper/commit/c50969c3a804c16664c68aac90a8abd76ee72ebe))

### Bug Fixes

- **agents:** address review findings for ai-prompt-engineer ([46ef856](https://github.com/SpiceLabsHQ/Reaper/commit/46ef856715fea8b8fc832ac7f44eddfb889eea55)), closes [#17](https://github.com/SpiceLabsHQ/Reaper/issues/17) [#8](https://github.com/SpiceLabsHQ/Reaper/issues/8)
- **agents:** resolve conflicting file-write instructions in ai-prompt-engineer ([1994902](https://github.com/SpiceLabsHQ/Reaper/commit/1994902cf622ae9b61838c1c790b957008b29b56)), closes [#13](https://github.com/SpiceLabsHQ/Reaper/issues/13)
- **ci:** resolve glob expansion failure and add coverage thresholds ([3c72f02](https://github.com/SpiceLabsHQ/Reaper/commit/3c72f02bc20960209218555e753faeabca013719))
- **docs:** correct coverage threshold to 70% in Contributing section ([f306929](https://github.com/SpiceLabsHQ/Reaper/commit/f30692972eba53094440cf09a1e51ed83c2bf858))
- **flight-plan:** replace plain-text approval with AskUserQuestion ([030f252](https://github.com/SpiceLabsHQ/Reaper/commit/030f252ab89d35d62dac2d511135ac2aef40c4a1))
- **huddle:** address prompt engineering audit findings ([943917d](https://github.com/SpiceLabsHQ/Reaper/commit/943917df162c97d0b1c4712e2d881ffc1e8e6de5))
- **prompts:** remove parent-child from ADD_DEPENDENCY semantics ([e4359e9](https://github.com/SpiceLabsHQ/Reaper/commit/e4359e9da68ecd286e7f7d87566f07e2d551bcbd))
- resolve 10 infrastructure, config, and documentation bugs ([f400d17](https://github.com/SpiceLabsHQ/Reaper/commit/f400d17cf0240b45ecd50add52ec86094198750c))
- resolve 9 template, command, and documentation bugs ([83dcb55](https://github.com/SpiceLabsHQ/Reaper/commit/83dcb55d7f4007934e8ea5feeeddb3645e211117))
- **takeoff:** handle multi-level task hierarchies in pre-planned detection ([fb7beee](https://github.com/SpiceLabsHQ/Reaper/commit/fb7beeea2e6f9feedbd9f75dacf5c2fe1cf33b7d))
- **test-runner:** enforce single-execution test protocol to prevent double runs ([8f37df4](https://github.com/SpiceLabsHQ/Reaper/commit/8f37df4eb6e61e24ae713c36fe0a9477de2c3cdb))
- **test:** consolidate all test suites lost in parallel merge ([8633ae9](https://github.com/SpiceLabsHQ/Reaper/commit/8633ae97f75bf680f46414b99984a11637e85073))
- **visual-vocab:** remove backtick-quoted !! that triggers bash permission checker ([56cb05b](https://github.com/SpiceLabsHQ/Reaper/commit/56cb05b4a06c3fa0c30a7b736ac77153ef6b2e18))
- **workflow-planner:** remove human-hour time estimates from sizing constraints ([9d7ee96](https://github.com/SpiceLabsHQ/Reaper/commit/9d7ee9619e52c13e4d51a49c783ab9fae8f0cd55))

### Refactoring

- **agents:** audit and optimize all 23 agent prompts for Claude Opus 4.5 ([6d277d1](https://github.com/SpiceLabsHQ/Reaper/commit/6d277d158423797ec1fb797fe6d9de63c483e897))
- **agents:** deduplicate ai-prompt-engineer against knowledge base ([d39bac6](https://github.com/SpiceLabsHQ/Reaper/commit/d39bac6d41791db1e135225c932d45ea8979eb6b))
- **agents:** pre-deploy polish for Reaper v1.7.0 ([556c2c8](https://github.com/SpiceLabsHQ/Reaper/commit/556c2c83767e4dafe12f093933cc359fc84ae989))
- **commands,agents:** rewrite orchestration templates with partials ([0335971](https://github.com/SpiceLabsHQ/Reaper/commit/03359713df36913b5ce1bed0cda8d61e1a8b3e09))
- **commands:** rename war-room to huddle ([f947459](https://github.com/SpiceLabsHQ/Reaper/commit/f94745922fa3daa2aefad21a5251dd4b8f1e77cd))
- **docs:** recategorize agents — Meta → Craft, validation-runner → Quality ([f82ac33](https://github.com/SpiceLabsHQ/Reaper/commit/f82ac33e3426511c518616a49c04ed8ded42aab4))
- extract SPICE standards and soften prescriptive language ([7a026b4](https://github.com/SpiceLabsHQ/Reaper/commit/7a026b4b26cf35eb0e5ace33dde2a44c25f377e5))
- **partials:** create 6 shared partials for orchestration pipeline ([269b7c1](https://github.com/SpiceLabsHQ/Reaper/commit/269b7c183e208abe635cd2fb4501cfaf670971c7))
- **partials:** harden orchestrator guardrails and quality gate validation ([36a8683](https://github.com/SpiceLabsHQ/Reaper/commit/36a868354c2918ff6dd253deb17567a9b0577852))
- **squadron:** optimize prompt quality and reduce token waste ([e9636bb](https://github.com/SpiceLabsHQ/Reaper/commit/e9636bbec157510b3f73d026258f5bc41dbd582b))
- **takeoff:** add structural loop anchors to prevent execution fall-through ([f911fdf](https://github.com/SpiceLabsHQ/Reaper/commit/f911fdf1ff0a3d90a61b7d75af1f4454082c1761))
- **takeoff:** strengthen completion guard with re-read protocol ([e3355a1](https://github.com/SpiceLabsHQ/Reaper/commit/e3355a12578572a9aeaccbf63970a00b8850468e))
- **visual-vocab:** rename GROUNDED gauge state to TAXIING ([#5](https://github.com/SpiceLabsHQ/Reaper/issues/5)) ([a791db9](https://github.com/SpiceLabsHQ/Reaper/commit/a791db9c4e88c211f07b10d884412a7915580114))

### Documentation

- add prompt engineering knowledge base for ai-prompt-engineer agent ([ab9d8d0](https://github.com/SpiceLabsHQ/Reaper/commit/ab9d8d051415f7e6dd776a8e0d6e2ae8bf93523e))
- add The Five Keys core values to CLAUDE.md ([d8e6225](https://github.com/SpiceLabsHQ/Reaper/commit/d8e6225dd924a5c19ad9f5af535c5ce6f1856feb))
- **claude:** add documentation maintenance requirements and docs/ to project structure ([84e5481](https://github.com/SpiceLabsHQ/Reaper/commit/84e54818bc7e512c406db7833b3f183134e06627))
- **claude:** add environment requirements and visual-vocabulary partial ([e2d24fc](https://github.com/SpiceLabsHQ/Reaper/commit/e2d24fc144a8bbf76538687fdaf59e92ef0b0430))
- **CLAUDE:** improve prompt quality based on ai-prompt-engineer audit ([547e20b](https://github.com/SpiceLabsHQ/Reaper/commit/547e20beb1dc29669341b08e8989c5fc7d304b75))
- **CLAUDE:** update coverage target to 70% with test infrastructure improvements ([2f0b5a6](https://github.com/SpiceLabsHQ/Reaper/commit/2f0b5a6165cbe71551affadac6ec23b2a874891b))
- **readme:** add kawaii banner and reorganize hero section ([2c571a6](https://github.com/SpiceLabsHQ/Reaper/commit/2c571a63428b8c0f41ee96459e6c07983f2491b8))
- **readme:** add usage sections and usage limit claim ([92c0bb2](https://github.com/SpiceLabsHQ/Reaper/commit/92c0bb2b8a584a9e58776d64c297382ec4579530))
- redesign README and create user-facing docs ([c76fe37](https://github.com/SpiceLabsHQ/Reaper/commit/c76fe373263f390e6ac5a0990a75917ba7aac7a5))
- reframe workflow entrypoints with flight-plan as default starting point ([a1b6d11](https://github.com/SpiceLabsHQ/Reaper/commit/a1b6d11b63a9981119d48ff04dde6b2bf632196b))
- remove docs/spice/ and update CLAUDE.md references ([1728ca8](https://github.com/SpiceLabsHQ/Reaper/commit/1728ca8c4b7b3be8805935c953f7ee5d3c55da5a))
- **start:** add /start documentation, tests, and contract coverage ([1c3c047](https://github.com/SpiceLabsHQ/Reaper/commit/1c3c0477bd096569ec76ae84d03a4e52b16af098))
- **worktree-manager:** document timeout, lock detection, and AI remediation ([6527cb1](https://github.com/SpiceLabsHQ/Reaper/commit/6527cb1961864311be3abc2781bb0f53adbded60))

### Styling

- **commands:** remove residual CRITICAL marker from flight-plan ([8dec67e](https://github.com/SpiceLabsHQ/Reaper/commit/8dec67e96c122905d4d8313e51d979944ede30df))

### Tests

- **build:** add compileTemplate and processFile integration tests ([b6085d5](https://github.com/SpiceLabsHQ/Reaper/commit/b6085d58819b3968d0a0e7f4a3fc7a8b6b1cb35a))
- **build:** add comprehensive parseFrontmatter unit tests ([1f085f1](https://github.com/SpiceLabsHQ/Reaper/commit/1f085f138f681e5d96bd5859d897cd32540a7096))
- **build:** add getAgentType and formatError unit tests ([4c500b5](https://github.com/SpiceLabsHQ/Reaper/commit/4c500b5cc198dbdee27b9a3e4fbda65da3eae1f1))
- **build:** add getAgentType and formatError unit tests ([903b774](https://github.com/SpiceLabsHQ/Reaper/commit/903b774485e293a5598dee42711d69ba9d3675f7))
- **build:** add parseArgs and commitlint beads-ref rule tests ([008a801](https://github.com/SpiceLabsHQ/Reaper/commit/008a8018493e647c4bd9fee76a4194aaca53a2f4))
- **contracts:** add structural contract validation for generated output ([9c70abb](https://github.com/SpiceLabsHQ/Reaper/commit/9c70abbd684eeebd4b270c3f1e9cb436dcc1f4c0))
- **contracts:** add visual vocabulary integration contracts ([a5d7f11](https://github.com/SpiceLabsHQ/Reaper/commit/a5d7f11a223df7e4b87353099f80c0e4d44bf221))
- **infra:** wire up node:test infrastructure with state isolation helpers ([c3541ec](https://github.com/SpiceLabsHQ/Reaper/commit/c3541ec0f6486d6907ef32a464e016a5a5afd103))
- **visual-vocabulary:** add Gate Panel isolation tests and update GAUGE_STATES constant ([a679dfb](https://github.com/SpiceLabsHQ/Reaper/commit/a679dfb7bf823707915564a173b2f3e910e342eb))

## [1.7.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.6.1...v1.7.0) (2026-01-24)

### Features

- **worktree-manager:** add timeout wrapper with AI remediation output ([6637d78](https://github.com/SpiceLabsHQ/Reaper/commit/6637d788e09fc41f6d4d283ab5960de5fa21bef5))

### Bug Fixes

- **commands:** prohibit EnterPlanMode in flight-plan command ([fbe2d08](https://github.com/SpiceLabsHQ/Reaper/commit/fbe2d088139f9ac047f2c040b68d33eefb9f18cc))

## [1.6.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.6.0...v1.6.1) (2026-01-23)

### Bug Fixes

- **commands:** add VERSION_BUMP=0 for pre-push hook ([d789721](https://github.com/SpiceLabsHQ/Reaper/commit/d7897211f8b3598f102e2ca512bd55a466c389c7))

### Refactoring

- **commands:** optimize release command for project workflow ([8cb0fd7](https://github.com/SpiceLabsHQ/Reaper/commit/8cb0fd7f98d0d4adc0278b01fd88d42ea88fd447))

## [1.6.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.3...v1.6.0) (2026-01-23)

### Features

- **commands:** add /release command for merging develop to beads-sync ([df6d6a3](https://github.com/SpiceLabsHQ/Reaper/commit/df6d6a3b858dd0c696474dd91198a951e3199674))
- **flight-plan:** enforce TDD methodology in work unit planning ([ebd5ced](https://github.com/SpiceLabsHQ/Reaper/commit/ebd5ced2b64c33bf0f2c75e0e8e6f396df112a01))

### Bug Fixes

- **commands:** use AskUserQuestion for release confirmation ([ead0b1c](https://github.com/SpiceLabsHQ/Reaper/commit/ead0b1c22f8be16411228d441c14d85c2f0184e6))
- **commands:** use main branch instead of beads-sync for releases ([f0daef9](https://github.com/SpiceLabsHQ/Reaper/commit/f0daef9e3e25443bd17e9a79fd6e7e3537bd756d))
- **worktree-manager:** restore missing shell scripts from EJS refactor ([6e156b2](https://github.com/SpiceLabsHQ/Reaper/commit/6e156b271d907526b14292dc5962501b4660cf48))

### Refactoring

- **agents:** use shared partials for consistent agent structure ([ab04fb6](https://github.com/SpiceLabsHQ/Reaper/commit/ab04fb6e2b82325df879f090a781365dd353ba3c))
- **flight-plan:** remove session tracking from plan output ([3bdc0e9](https://github.com/SpiceLabsHQ/Reaper/commit/3bdc0e9800031f4fc422eb40c560e9c34861a39d))
- **partials:** rewrite TDD testing protocol with testing philosophy ([55b82b0](https://github.com/SpiceLabsHQ/Reaper/commit/55b82b066923a3f52ad186e7bf7c6f4d531f207d))
- remove Spice skill and standardize doc paths to CLAUDE_PLUGIN_ROOT ([de641fc](https://github.com/SpiceLabsHQ/Reaper/commit/de641fc263aed74c28fdbf90adc748c9b694b024))

### Styling

- **flight-plan:** remove orphaned REPLACE update type definition ([10ae772](https://github.com/SpiceLabsHQ/Reaper/commit/10ae772f48eba499236c68034612fffcefc37232))

## [1.5.3](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.2...v1.5.3) (2026-01-18)

### Bug Fixes

- **commands:** use local project directory for flight-plan files ([cba0771](https://github.com/SpiceLabsHQ/Reaper/commit/cba07716189e09fe3af7cb55ec70796ce46ada96))

## [1.5.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.1...v1.5.2) (2026-01-18)

### Bug Fixes

- **commands:** remove plan mode tool calls from flight-plan ([4112fd8](https://github.com/SpiceLabsHQ/Reaper/commit/4112fd8c4bda619d3b7dc763cd55462e70fb0fae))

## [1.5.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.5.0...v1.5.1) (2026-01-18)

## [1.5.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.3.0...v1.5.0) (2026-01-18)

### Features

- **commands:** enhance takeoff & flight-plan commands ([dc317c0](https://github.com/SpiceLabsHQ/Reaper/commit/dc317c074413a129ee5b1feb49173098f1c9b041))
- **commands:** integrate native plan mode into flight-plan ([3c8bf5c](https://github.com/SpiceLabsHQ/Reaper/commit/3c8bf5c1dc76746a2435d7c9bf5943260637d64b))
- **skills:** convert commands to user-invocable skills ([851efd5](https://github.com/SpiceLabsHQ/Reaper/commit/851efd5a49cf1a87034f094fd5b8301af039ab7b))

### Bug Fixes

- **skills:** restructure user-invocable skills for proper discovery ([840fa39](https://github.com/SpiceLabsHQ/Reaper/commit/840fa39d5d3c7a5dab0533e4d537a530a7098d2f))
- **takeoff:** reinforce full-scope execution for pre-planned epics ([a9943d2](https://github.com/SpiceLabsHQ/Reaper/commit/a9943d21523649501c09dd4221095b5762663667))

## [1.3.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.2.0...v1.3.0) (2026-01-14)

### Features

- **build:** add EJS template build system for DRY plugin development ([e7c3031](https://github.com/SpiceLabsHQ/Reaper/commit/e7c303116a79ea98d43dbca07a50c6c942bff1a7))
- **worktree-manager:** require explicit branch disposition on cleanup ([e85ebfb](https://github.com/SpiceLabsHQ/Reaper/commit/e85ebfbaea10db48268c95ce89e1c9d6fa5c3378))

### Bug Fixes

- **hooks:** detect pushes TO main, not just FROM main ([93a9bc1](https://github.com/SpiceLabsHQ/Reaper/commit/93a9bc1821bc271769a54ae948117eb18948f5e0))
- **worktree-manager:** add CWD safety instructions for cleanup ([a07fc93](https://github.com/SpiceLabsHQ/Reaper/commit/a07fc931969411c003167307c615a718698f9314))

### Refactoring

- **agents:** standardize agent naming conventions ([8e69c7d](https://github.com/SpiceLabsHQ/Reaper/commit/8e69c7d4c5dd0d711bc82fcfdc15fa692a5b90ce))

## [1.2.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.2...v1.2.0) (2026-01-12)

### Features

- **agents:** add Stop hooks for orchestration flow ([40ad9c3](https://github.com/SpiceLabsHQ/Reaper/commit/40ad9c36fed8f1bd9ed55136b9659eccdb9bcfcc))

### Refactoring

- **agents:** slim down JSON output to essential fields ([dfb4afb](https://github.com/SpiceLabsHQ/Reaper/commit/dfb4afb9e389117c5156f6153101c48b0ab7d611))

## [1.1.2](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.1...v1.1.2) (2026-01-12)

### Refactoring

- **release:** simplify pre-push hook to gate-only pattern ([9d0d23e](https://github.com/SpiceLabsHQ/Reaper/commit/9d0d23ee541410522865f768e8249311c0a094b1))

## [1.1.1](https://github.com/SpiceLabsHQ/Reaper/compare/v1.1.0...v1.1.1) (2026-01-12)

### Bug Fixes

- **release:** simplify pre-push hook to avoid exit code confusion ([de2e5a7](https://github.com/SpiceLabsHQ/Reaper/commit/de2e5a786b704409ced5b64b08088a34118a75a2))

## [1.1.0](https://github.com/SpiceLabsHQ/Reaper/compare/v1.0.0...v1.1.0) (2026-01-12)

### Features

- **release:** add automated semantic versioning with commit-and-tag-version ([b449185](https://github.com/SpiceLabsHQ/Reaper/commit/b449185d582c1c61d73118daa55cbeb26112f671))

## 1.0.0 (2026-01-12)

### Features

- **agents:** add 7 specialized agent specifications ([d89582a](https://github.com/SpiceLabsHQ/Reaper/commit/d89582a372f3f4ff8e9ccbb84035774f83308e8d))
- **agents:** add claude-agent-architect for agent design standards ([3ca2062](https://github.com/SpiceLabsHQ/Reaper/commit/3ca206232e17913db7ecf72963a3215ec3c1e1c2))
- **agents:** add input validation and Beads hierarchy queries to workflow-planner ([8abb08d](https://github.com/SpiceLabsHQ/Reaper/commit/8abb08dcaee8e9ebe0a175840f95a9ccdb41151a))
- **agents:** enforce modern workflow requirements ([5f23032](https://github.com/SpiceLabsHQ/Reaper/commit/5f230324f86d9e6f434b0e48574b719c9cb62645))
- **agents:** integrate worktree-manager skill into workflow-planner and orchestrate ([bff3eca](https://github.com/SpiceLabsHQ/Reaper/commit/bff3eca7e801eaf3e7b76769403d8c7fff56c42c))
- **agents:** update model assignments for Haiku 4.5 and Sonnet 4.5 ([d32eca4](https://github.com/SpiceLabsHQ/Reaper/commit/d32eca4330f3d45025d2cfaf357c95345cae9be9))
- **beads:** configure beads-sync orphan branch with auto-push ([ac1f1ea](https://github.com/SpiceLabsHQ/Reaper/commit/ac1f1eab5193581d8e6e631f3853aa1466ecbf2c))
- **commands:** add claude-sync slash command ([bbdfb36](https://github.com/SpiceLabsHQ/Reaper/commit/bbdfb368cdbd0ce359253f6b2352d283d0d9381e))
- **commands:** add spice:plan autonomous execution planner ([8d7b19b](https://github.com/SpiceLabsHQ/Reaper/commit/8d7b19b4e2633aeeedf57ecaf613749f9fa9bd47))
- enhance test validation with directory detection and organization checks ([e313a07](https://github.com/SpiceLabsHQ/Reaper/commit/e313a07eda04b3c7e553d9b59c57758ff0c322ea))
- **hooks:** add context-aware notifications with custom messages ([5cd79ec](https://github.com/SpiceLabsHQ/Reaper/commit/5cd79ec9d3aedf4be902878933a809787ce91fff))
- **hooks:** add Pushover notification on Stop event ([770fcbf](https://github.com/SpiceLabsHQ/Reaper/commit/770fcbf84bc50875060429baa38e3da45af1b755))
- **hooks:** add SubagentStop hook for automatic quality gates ([1fa8b29](https://github.com/SpiceLabsHQ/Reaper/commit/1fa8b2958aaffa127577d0ee65dcd202b20c1153))
- **orchestrator:** add flexible task ID system with multi-platform support ([161027f](https://github.com/SpiceLabsHQ/Reaper/commit/161027f18807b365445889d5bd32fd760a7f9017)), closes [#456](https://github.com/SpiceLabsHQ/Reaper/issues/456)
- **permissions:** add Beads CLI and MCP tool permissions ([6047afe](https://github.com/SpiceLabsHQ/Reaper/commit/6047afe3377f065891fa0acd5942bc8c5dc6f13b))
- **permissions:** add Context7 MCP tools to allow list ([32318b3](https://github.com/SpiceLabsHQ/Reaper/commit/32318b322ce2d6524ec3b5eb40cc591e3f7b5ac5))
- **plugin:** convert repository to Claude Code plugin structure ([9d14ce9](https://github.com/SpiceLabsHQ/Reaper/commit/9d14ce921c4da46277371b236c20a5cd706716dc))
- **skills:** add SPICE workflow automation skills package ([843304a](https://github.com/SpiceLabsHQ/Reaper/commit/843304a0c5f9cab1fdd326947734c4d12fb5b44e))
- **skills:** add worktree-manager skill with safe cleanup scripts ([9027b20](https://github.com/SpiceLabsHQ/Reaper/commit/9027b20a1beb01f293c267a27b9ac903173eb065))
- **spice:orchestrate:** improve task naming and user feedback flow ([9abc0e2](https://github.com/SpiceLabsHQ/Reaper/commit/9abc0e21cbaf48faa5fe5497d8bda8d17f3ff7c6))
- **spice:plan:** add issue verification phase ([8c9b1a7](https://github.com/SpiceLabsHQ/Reaper/commit/8c9b1a7e50772daec5c734768dc1a3237da64fff))
- **spice:plan:** add issue verification phase using workflow-planner ([0cbc75d](https://github.com/SpiceLabsHQ/Reaper/commit/0cbc75df0ebd5cfc54d60503977a5e7215db388d))
- **spice:plan:** add user intervention handling and assignment syntax ([928fc5b](https://github.com/SpiceLabsHQ/Reaper/commit/928fc5be764b566d9c076ecb8e7811cb13980c94))
- update system to use iterative workflow ([f11e156](https://github.com/SpiceLabsHQ/Reaper/commit/f11e1565729e6ea4674e599c1315a7437ce763d2))
- **workflow-planner:** add content generation complexity dimension ([771f281](https://github.com/SpiceLabsHQ/Reaper/commit/771f281151eb0f50c7f6c4c5c23dc99c2c22fa6b))

### Bug Fixes

- **agents:** standardize nomenclature and fix inconsistencies in quality gate agents ([abc3b1a](https://github.com/SpiceLabsHQ/Reaper/commit/abc3b1a007a39d74669e5180b709718f0d39247c))
- **commands:** add close task reminder to takeoff TodoWrite ([7fcb610](https://github.com/SpiceLabsHQ/Reaper/commit/7fcb61095a31723be8fa72c2b3a8cfea69357c1b))
- **commands:** add conditional TodoWrite items to takeoff ([dd77fbc](https://github.com/SpiceLabsHQ/Reaper/commit/dd77fbc6a7e1f3d18dfadb1400a02a9195bc9388))
- **config:** initialize variable and reorder permissions sections ([c5592af](https://github.com/SpiceLabsHQ/Reaper/commit/c5592af12b2ffdb6e8a3212844822ce2eb3c4e01))
- **hooks:** format notification with context on separate line ([fc96b6e](https://github.com/SpiceLabsHQ/Reaper/commit/fc96b6ec98b299d4369b5d001c82560599a3fc5f))
- **skills:** use CLAUDE_PLUGIN_ROOT for portable path references ([8437556](https://github.com/SpiceLabsHQ/Reaper/commit/8437556f0976cbbd2f1d8ca3f88cf447f8cb024a))
- **spice:plan:** add Phase 7 completion protocol to prevent implementation after planning ([78c252f](https://github.com/SpiceLabsHQ/Reaper/commit/78c252f277953791f9526834321986293ecd5a3f))
- **spice:plan:** correct Beads dependency syntax for parent-child vs blockers ([cb55f56](https://github.com/SpiceLabsHQ/Reaper/commit/cb55f56a8eec59f8de54bf600f7f0fe0d145d671))

### Refactoring

- **agents:** add reaper: prefix to all agent references ([de28f25](https://github.com/SpiceLabsHQ/Reaper/commit/de28f25d35a9f1ab34f054527584b9964dafb51b))
- **agents:** centralize worktree management in branch-manager ([334809d](https://github.com/SpiceLabsHQ/Reaper/commit/334809de013b43a60a3baa7d3fc694059638f01d))
- **agents:** enforce separation of concerns and dual authorization ([d6087eb](https://github.com/SpiceLabsHQ/Reaper/commit/d6087ebc9278fb1706f10cd4781fa3e29111df88))
- **agents:** improve model selection and workflow stage colors ([ccc5f68](https://github.com/SpiceLabsHQ/Reaper/commit/ccc5f68c5a18e255821f24fc3999706e7183618d))
- **agents:** optimize model declarations for auto-selection ([8e52cdd](https://github.com/SpiceLabsHQ/Reaper/commit/8e52cddc5fe47f085a1a6a6e8a5c31a6707ec403))
- **agents:** qualify agent names with reaper: prefix ([d693ccf](https://github.com/SpiceLabsHQ/Reaper/commit/d693ccfd324585a2f5d3e2acd4a6740b6526ea73))
- **agents:** separate orchestration and strategy planning concerns ([6b1854b](https://github.com/SpiceLabsHQ/Reaper/commit/6b1854bb0c6057ed7259a9da99c28917c04e00ae))
- **agents:** simplify quality gate workflow with auto-iteration ([6ad1b7d](https://github.com/SpiceLabsHQ/Reaper/commit/6ad1b7dc4ac6dc48dc6b1ef96a4c2f238836b9f4))
- **claude:** remove archived settings, enable plugin-dev plugin ([74dd87a](https://github.com/SpiceLabsHQ/Reaper/commit/74dd87a26172ff499b146c5246a506ee554e6bd7))
- **commands:** rename plan→flight-plan, orchestrate→takeoff ([0eb1a46](https://github.com/SpiceLabsHQ/Reaper/commit/0eb1a46835554ad72bc1edbe6b2d364f40111d8d))
- **gitignore:** switch to whitelist-based ignore pattern ([763b27e](https://github.com/SpiceLabsHQ/Reaper/commit/763b27e526c00ffab5e750928125638f7b036d62))
- **scripts:** move acli-jira-auth.sh to scripts directory ([5778403](https://github.com/SpiceLabsHQ/Reaper/commit/57784039598996f021002365964d7d319da876ee))
- **spice:orchestrate:** streamline quality gate auto-iteration ([857f3b1](https://github.com/SpiceLabsHQ/Reaper/commit/857f3b1e51f516ac22c39f2e6a950c42a71c7150))
- standardize JIRA_KEY/JIRA_TICKET to generic TASK_ID ([0ec4f10](https://github.com/SpiceLabsHQ/Reaper/commit/0ec4f10c7ea93fcad1c60d49eed34edf6f9017a5))

### Documentation

- add README and organize SPICE documentation ([34e012b](https://github.com/SpiceLabsHQ/Reaper/commit/34e012baef12a04e6205d6cdc669a34d13a3b880))
- **agents:** add examples to agent descriptions for orchestrator context ([0e973d7](https://github.com/SpiceLabsHQ/Reaper/commit/0e973d7e3d8038fa157b5a6608b085d44681f222))
- **agents:** add format template and document in README ([458d118](https://github.com/SpiceLabsHQ/Reaper/commit/458d118e5f9f726fb1a7ae18ccfb7d7a53ac46c8))
- **agents:** clarify quality-gate-controlled commits ([8be1112](https://github.com/SpiceLabsHQ/Reaper/commit/8be111270030d9fa5c41757eda89d019a6046097))
- **agents:** establish workflow-based color standard for visual progress feedback ([2ba46f6](https://github.com/SpiceLabsHQ/Reaper/commit/2ba46f6c8cac26799703d8110c681de120b882ec))
- **agents:** remove file-writing examples that conflict with JSON output requirement ([fbf9641](https://github.com/SpiceLabsHQ/Reaper/commit/fbf9641308f8f4de616d5492fbec4054f51edd01))
- **agents:** reorganize by workflow stage and add new specialized agents ([8b51dae](https://github.com/SpiceLabsHQ/Reaper/commit/8b51daeb586f314d8f8041f7f30603aa39981e90))
- **commands:** update descriptions with aviation theming ([f3557c7](https://github.com/SpiceLabsHQ/Reaper/commit/f3557c7d1c9e69f28c3d974fa837e60bb9eb70df))
- complete SPICE file moves to docs/spice/ ([3f6166e](https://github.com/SpiceLabsHQ/Reaper/commit/3f6166ecfec2bb2057ecba23fc39c0948bf6ac94))
- **readme:** refresh brand voice with aviation theme ([6563938](https://github.com/SpiceLabsHQ/Reaper/commit/6563938441e2e3d47fdbfb4002332782eedb49c9))
- refactor standards to reduce context usage with role clarity ([e034026](https://github.com/SpiceLabsHQ/Reaper/commit/e034026ff4dda029bbbd06a35803022756accfa4))
- **spice:** add cloud infrastructure standards ([36de383](https://github.com/SpiceLabsHQ/Reaper/commit/36de383f55b8babace94c2d6d1a39d6ca18fc970))
- **spice:** add OIDC authentication guide for Bitbucket Pipelines ([f96b2d0](https://github.com/SpiceLabsHQ/Reaper/commit/f96b2d049a87fc6f2cfe9557de0fd1b9ffddeadd))

### Styling

- **commands:** add aviation-themed messaging to flight-plan and takeoff ([1f04973](https://github.com/SpiceLabsHQ/Reaper/commit/1f0497318c540e4403e92d9b2e80907554802ab8))
