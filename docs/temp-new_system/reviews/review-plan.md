# Review Request

Objective: Establish Adventureland Bot/Bot-System basic requirements/components

Context:
- `adventureland/`: One of my attempts for a bot system for Adventureland, there are two active branches `main` and `codex`
- `hypfer-fixate/`: Another attempt for a bot system for Adventureland
- `IkeBot/`: Recent scaffolding for a client and bot system for Adventureland
- `Pbot/`: Open source bot for Adventureland for reference

Task: Identify and list the basic requirements/components 
- Review `adventureland/` documentation and implementation
- Review `hypfer-fixate/` documentation and implementation
- Review `IkeBot/docs` and `IkeBot/bot-system/docs` documentation
- Review `Pbot/` documentation and implementation

Establish baseline list of features/functionality that a bot and/or bot-system should handle
Decompose into system components
Identify possible design patterns for how each component and overarching system could be addressed with pros/cons of each implementation

Output:
- `temp-new_system/reviews`: store a review/summary for each of the requested reviews
- `temp-new_system/requirements`: document requirements with focused documentation
- `temp-new_system/components`: document possible component decomposition and possible design patterns for the component. There should also be an entry for the overarching system

I am working on establishing a fresh implementation for Adventureland (Code MMORPG). In the past I have used this game a training/learning resource to explore different software engineering principles.
I have an active, larger effort for a fresh client and bot-system implementation however it is scoped to large for what I currently want to progress on. I am looking for something I can work through on either the native client or the browser for the main server.
I may also attempt to use this code for my own self-hosted LAN server.
I will end up establishing a new branch and using the `adventureland/` git repo once I begin implementation efforts.
Thoughts/notes are scattered across my three repos; I have also sourced some ideas and understanding in previous implementations from the PBot repo. I would like to consolidate some core concepts and then work from there on a fresh implementation.
I would like to be more purposeful and diligent in application of software engineering discipline; specifically for isolating components and then designing them around appropriate design patterns as well as employing a purposeful overall design pattern. 

## AdventureLand Browser-Native Bot Baseline Review and Design Synthesis (Established plan)

### Summary

Produce a browser-native / in-game CODE focused review and synthesis for a fresh AdventureLand bot implementation. The work will cover five review inputs:

- `adventureland/` branch `main`
- `adventureland/` branch `codex`
- `hyper-fixate/`
- `IkeBot/docs` and `IkeBot/bot-system/docs`
- `PBot/`
- plus a targeted capability review of the official game reference in `IkeBot/reference/` to ground what progression, world interaction, and game systems actually exist

This pass will explicitly ignore external custom-client concerns except where they help explain why a browser-native design must accept a limitation.

### Deliverables

#### `temp-new_system/reviews`

Create these review documents:

- `adventureland-main.md`
- `adventureland-codex.md`
- `hyper-fixate.md`
- `ikebot-docs.md`
- `pbot.md`
- `game-reference.md`

Expected focus per review:

- `adventureland-main.md`
  Review `src/` and `v2/` as separate implementation strata within the branch without assuming one evolved from the other. Document what each contains, what overlaps, what differs, and what appears complete vs stubbed.
- `adventureland-codex.md`
  Review `archive/src`, `archive/v2`, the newer `src/Bot` tree, `docs/design_notes.md`, `docs/questions.md`, and `src/Server/server.js` as a distinct later attempt with archived earlier work bundled into the branch.
- `hyper-fixate.md`
  Review implementation and notes around class inheritance, timers, party coordination, CM/localStorage usage, merchant workflows, and target/movement handling.
- `ikebot-docs.md`
  Use only as design/spec prior art. Extract ideas that still apply to a browser-native bot, and explicitly discard platform/client-specific architecture that is out of scope here.
- `pbot.md`
  Review modularity patterns, directive queue usage, shared communications, party handling, inventory/common modules, and the practical limits of that design.
- `game-reference.md`
  Review `IkeBot/reference/adventureland_mongodb` plus relevant shared/config repos to capture game-system facts needed for bot design:
  - items, upgrades, compounds, crafting/exchange relevance
  - monsters and pack characteristics
  - skills and class mechanics
  - maps, NPCs, transport, doors, events, instances
  - constraints that matter for automation

Each review doc will use a common structure:

- Scope reviewed
- Architectural shape
- Implemented capabilities
- Intended but incomplete capabilities
- Strong ideas worth carrying forward
- Weaknesses / risks / failure patterns
- Implications for a fresh browser-native implementation

### Requirements Output

#### `temp-new_system/requirements`

Create these files:

- `00-overview.md`
- `01-core-bot-requirements.md`
- `02-merchant-and-progression-requirements.md`
- `03-world-and-game-system-requirements.md`
- `04-nonfunctional-requirements.md`

Content expectations:

- `00-overview.md`
  Define the goal of the document set and the scope boundary: native client/browser bot only.
- `01-core-bot-requirements.md`
  Baseline requirements every usable browser-native bot should solve.
- `02-merchant-and-progression-requirements.md`
  Requirements for inventory, gearing, banking, supply, item improvement, farming support, and progression-oriented decision making.
- `03-world-and-game-system-requirements.md`
  Requirements derived from actual game systems in the reference code: monster hunts, events, NPC interactions, map travel, item/skill mechanics, and progression opportunities that the bot must reason about programmatically.
- `04-nonfunctional-requirements.md`
  Maintainability, observability, recoverability, configurability, safety, testability, and browser-native constraints.

Requirement groups to capture:

- Bootstrapping and runtime lifecycle
- Recovery from death, reload, and partial state loss
- State awareness for self, party, monsters, players, NPCs, and map context
- Party assembly and coordination
- Movement and travel
- Targeting, kiting, healing, attack execution, and class-skill usage
- Threat response and defensive PvP handling
- Inventory, banking, and equipment management
- Merchant supply, trade, and improvement workflows
- Objective selection for farming, hunts, events, and progression
- Communication and shared state across characters
- Logging, diagnostics, and operator visibility
- Configuration and tuning

For each requirement record:

- Description
- Why it matters
- Minimum baseline behavior
- Priority: `must`, `should`, or `later`

### Component Decomposition Output

#### `temp-new_system/components`

Create these files:

- `00-overarching-system.md`
- `01-loader-runtime-and-shared-state.md`
- `02-world-model-and-entity-processing.md`
- `03-objective-selection-and-state-control.md`
- `04-party-coordination-and-communication.md`
- `05-movement-and-navigation.md`
- `06-combat-class-logic-and-survival.md`
- `07-merchant-inventory-and-item-improvement.md`
- `08-progression-planning-and-world-interactions.md`
- `09-logging-configuration-and-debuggability.md`

Each component doc will include:

- Purpose
- Responsibilities
- Dependencies
- Explicit non-responsibilities
- Candidate design patterns
- Recommended default pattern for a fresh browser-native implementation
- Pros / cons of each pattern
- Notes about known AdventureLand/browser constraints

Pattern coverage:

- `00-overarching-system.md`
  Compare:
  - modular monolith with strict subsystem boundaries
  - hierarchical state-machine centered system
  - blackboard/world-model centered system
  - job/task-driven coordinator over subsystem executors

  Recommended default:
  `modular monolith with a centralized world model and hierarchical state control`, because it fits browser-native CODE constraints while still keeping boundaries explicit.

- `01-loader-runtime-and-shared-state.md`
  Compare:
  - `load_code` layered numbering
  - generated single-bundle / compiled source pasted into CODE
  - hybrid loader plus logical modules

- `02-world-model-and-entity-processing.md`
  Compare:
  - direct polling and ad hoc queries
  - centralized tracked-entity repository
  - event-assisted world model built from game callbacks plus polling refresh

- `03-objective-selection-and-state-control.md`
  Compare:
  - flat FSM
  - hierarchical FSM
  - utility-scored objective selector with stateful executors
  - behavior tree

- `04-party-coordination-and-communication.md`
  Compare:
  - leader/follower command model
  - shared localStorage blackboard
  - CM message protocol with localStorage fallback
  - hybrid leader-issued directives plus shared status snapshots

- `05-movement-and-navigation.md`
  Compare:
  - `smart_move` wrapper only
  - custom move manager over `smart_move` and local repositioning
  - route planner plus local steering/kiting layer

- `06-combat-class-logic-and-survival.md`
  Compare:
  - per-class procedural handlers
  - shared combat engine plus class policy hooks
  - priority-rule system for target and skill decisions

- `07-merchant-inventory-and-item-improvement.md`
  Compare:
  - monolithic merchant state machine
  - workflow/task queue
  - policy evaluator producing merchant jobs

- `08-progression-planning-and-world-interactions.md`
  Compare:
  - hardcoded progression path
  - config-driven target lists
  - utility scoring over farm targets, upgrades, hunts, and events

- `09-logging-configuration-and-debuggability.md`
  Compare:
  - console plus localStorage logs
  - structured in-memory/log-buffer model with persisted snapshots
  - lightweight append-only status/log channels per character

### Review Method

Use these rules throughout the synthesis:

- Treat `adventureland/main` and `adventureland/codex` as separate reviews
- Do not assume `src` and `v2` form a linear evolution unless the branch contents actually support that conclusion; if uncertain, document the ambiguity explicitly
- Separate `implemented behavior`, `documented intent`, and `speculative future idea`
- Promote something to baseline only if it is:
  - necessary for a practical browser-native bot, or
  - reinforced across multiple prior implementations, or
  - required by actual game mechanics from the reference code
- Use the game reference to validate which world interactions and progression mechanics deserve first-class requirements
- Keep custom-client/platform ideas out of the recommended design except when documenting why they were previously attractive but are now intentionally out of scope

Recurring anti-patterns to capture as design constraints:

- brittle `load_code` / file-order coupling
- hardcoded character names and party assumptions
- state hidden in localStorage without schema or ownership
- timer sprawl without clear component ownership
- silent catch blocks and poor debugging
- class extension trees with large shared base classes and many partial stubs
- mixing strategic decision-making with low-level execution logic

### Test and Acceptance Criteria

The documentation pass is complete when:

- `adventureland/main` and `adventureland/codex` are reviewed separately
- the review explicitly distinguishes archived prior work from active code within `codex`
- the requirements are clearly scoped to browser-native/in-game CODE usage
- the game reference review materially informs the requirements, especially for:
  - item improvement and progression
  - map/NPC/world interaction
  - events and hunts
  - class skills and combat mechanics
- every component doc includes multiple viable patterns and one recommended default
- the final recommendations are decision-complete enough to guide a fresh implementation in `adventureland/` later

### Assumptions and Defaults

- `ALClient` and `caracAL` remain out of scope
- `IkeBot` is used as architecture/spec prior art only, not as the target architecture
- the fresh implementation target is a native client/browser bot, not a custom external platform
- `adventureland-codex` should be read as a later experiment that includes archived earlier attempts plus a newer browser-native bot structure
- game reference analysis will prioritize `adventureland_mongodb/design`, `node`, and selected shared/config files over unrelated infrastructure details
