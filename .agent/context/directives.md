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

**Remaining:**
- Capture project-level requirements and component specifications
- Validate build/bundling approach for AL's `load_code()` system
- Set up local development/testing environment

### D2: Document Component Specifications

Spec-plan each of the 9 identified components before implementation begins.

- **Status:** Pending (blocked by D1 completion)
- **Applies to:** Component documentation work
- **Rationale:** M1 (documentation-first). Each component needs requirements, design, and contracts documented before code is written.
- **Components:** Runtime & Shared State, World Model, Objective Selection, Party Coordination, Movement & Navigation, Combat & Class Logic, Merchant & Inventory, Progression Planning, Logging & Configuration

### D3: Runtime First

The runtime component (bootstrap, lifecycle, shared state) is the dependency for all other components.

- **Status:** Pending (blocked by D2 for runtime spec)
- **Applies to:** Implementation ordering
- **Rationale:** M3 (core before dependent). All other components depend on the runtime's entry point, loop management, and shared state infrastructure.

<!-- Template for new directives:

### D_: Directive Title

Brief description of the directive.

- **Status:** Active | Completed | Superseded
- **Applies to:** What scope this directive covers
- **Rationale:** Why this directive exists, linking to relevant mandates

-->
