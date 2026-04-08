# Directives

Phase-scoped guidance. Directives are secondary to active progress workstreams for execution routing — check `.agent/progress/` first.

Prune directives when they become irrelevant. Keep this file focused on current-phase priorities.

## Active Directives

### D1: Establish Project Foundation

Set up project structure, agentic worksurface, engineering standards, and development environment before writing application code.

- **Status:** In Progress
- **Applies to:** All initial setup work
- **Rationale:** M1 (documentation-first) and M3 (core before dependent) require the foundation to exist before building on it
- **Context:** AdventureLand (adventure.land) is a code MMORPG where players write JavaScript to control characters. Game docs: adventure.land/docs. Bot runs browser-native in the game's code editor.

**Completed:**
- Agent surface scaffolded (rules, skills, standards, policies)
- Project structure established: `docs/`, `src/`, `scripts/`
- Requirements captured (R1-R50) in `docs/requirements/`
- Architecture documented (7 decisions, 8 systems) in `docs/architecture/`
- Contracts index established in `docs/contracts/`
- Implementation roadmap (5 phases) in `docs/roadmap/`

**Remaining:**
- Set up esbuild build pipeline
- Set up local development/testing environment

### D2: Author Component Contracts

Author per-component contracts before implementation begins, sequenced by roadmap phase.

- **Status:** Pending (blocked by D1 build environment)
- **Applies to:** Contract authoring in `docs/contracts/`
- **Rationale:** M1 (documentation-first). Each component needs contracts documented before code is written.
- **Sequence:** Phase 0 (scheduler, event-bus) -> Phase 1 (world-model, logging) -> Phase 2 (combat, potion-regen, movement) -> Phase 3 (party, objective) -> Phase 4 (merchant)

### D3: Phase 0 Skeleton First

The skeleton (build pipeline, scheduler, event bus, shared context) is the dependency for all domain systems.

- **Status:** Pending (blocked by D2 for scheduler/event-bus contracts)
- **Applies to:** Implementation ordering per `docs/roadmap/`
- **Rationale:** M3 (core before dependent). All domain systems depend on the skeleton's entry point, scheduler, event bus, and shared context.

<!-- Template for new directives:

### D_: Directive Title

Brief description of the directive.

- **Status:** Active | Completed | Superseded
- **Applies to:** What scope this directive covers
- **Rationale:** Why this directive exists, linking to relevant mandates

-->
