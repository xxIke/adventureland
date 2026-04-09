# Directives

Phase-scoped guidance. Directives are secondary to active progress workstreams for execution routing — check `.agent/progress/` first.

Prune directives when they become irrelevant. Keep this file focused on current-phase priorities.

## Active Directives

### D4: Implement Against Redesigned Contracts

Phase 2 systems must be implemented against post-audit contracts. The original combat system was decomposed into three independent systems (targeting, attack, combat-skills) with revised contracts for potion-regen and movement.

- **Status:** Active
- **Applies to**: Phase 2 implementation
- **Rationale:** Audit (`docs/review/audit-v0.1.0.md`) found the monolithic combat system conflated independent concerns with different frequencies and applicability. Redesigned contracts restore the separation that v2 proved works.

**Key references:**
- `docs/contracts/_index.md` — contract status and retired contracts
- `docs/architecture/context-map.md` — ctx read/write ownership per system
- `docs/game-api.md` — game API semantics, cooldown groups, G data structure
- `docs/review/audit-v0.1.0.md` — audit findings driving the redesign

**Implementation scope:**
- `src/targeting.js` — new, per `docs/contracts/targeting.md`
- `src/attack.js` — new, per `docs/contracts/attack.md`
- `src/combat-skills.js` — new, per `docs/contracts/combat-skills.md`
- `src/potion-regen.js` — rewrite, per revised `docs/contracts/potion-regen.md`
- `src/movement.js` — rewrite, per revised `docs/contracts/movement.md`
- `src/boot.js` — update wiring (remove combat.js, add new systems)
- `src/combat.js` — remove (replaced by targeting + attack + combat-skills)

### D5: Game API Verification

All implementation and contract work involving game API calls must verify behavior against documented sources.

- **Status:** Active
- **Applies to:** All game API interaction work
- **Rationale:** Audit A1 found incorrect cooldown model assumptions propagated across contracts. Verification prevents recurrence.

**Workflow:**
1. Check `docs/game-api.md` first for documented behavior
2. If ambiguous or undocumented, consult external server reference (see `.agent/context/game-reference.md`)
3. When new knowledge is extracted, add it to `docs/game-api.md`

### D6: Phase 3 Contracts Ready

Phase 3 contracts are authored and ready for implementation after Phase 2 is complete.

- **Status:** Queued (blocked on Phase 2)
- **Applies to:** Objective and Party implementation
- **Rationale:** Phase 3 systems coordinate Phase 2 systems — they require working targeting, attack, and movement.

**Contracts:** `docs/contracts/objective.md`, `docs/contracts/party.md`

## Retired Directives

- **D1: Establish Project Foundation** — completed. Agent surface, project structure, requirements, architecture, build environment established.
- **D2: Author Component Contracts** — completed through Phase 3. All contracts authored or revised per audit.
- **D3: Phase 0 Skeleton First** — completed. Phase 0 and Phase 1 implemented.
