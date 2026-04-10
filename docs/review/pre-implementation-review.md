# Pre-Implementation Documentation Review

Review of all documentation layers (intent, requirements, architecture, contracts, game-api) for alignment and implementation readiness. Conducted before Phase 2+ implementation begins.

**Date**: 2026-04-09
**Resolved**: 2026-04-09
**Scope**: All docs/ files — intent (9 files), requirements (4 files), architecture (6 files), contracts (12 files), game-api.md
**Goal**: Identify deficiencies that would cause an implementation agent to hallucinate, guess, or produce misaligned code.
**Status**: All findings resolved. See resolution notes below each finding.

---

## Summary

Documentation is **strong overall** — system boundaries are clean, context ownership is well-defined, and MVP/end-state boundaries are explicit. The gaps below are real but bounded. Most are missing algorithmic detail or game-api documentation, not structural problems.

**Severity counts**: 5 high, 11 medium, 8 low

---

## HIGH — Blocks or significantly hinders implementation

### H1. `interact()` function missing from game-api.md

**Where referenced**: `docs/contracts/objective.md:127`, `docs/intent/objective.md:56`
**Impact**: Monster hunt acceptance (`interact("monsterhunt")`) is a `must` requirement (R37) but the function is completely undocumented. Implementer cannot verify signature, return type, preconditions, or error behavior.
**Fix**: Document `interact(npc_type)` in game-api.md. Verify from server reference (`common_engine`).
**Resolution**: Documented in game-api.md with signature, return values, and server source reference. Also added reference source pointers section to game-api.md so implementers can look up undocumented functions directly.

### H2. Merchant multi-step workflow utility functions not specified

**Where referenced**: `docs/contracts/objective.md:236`, `docs/architecture/infrastructure.md:119-153`
**Impact**: Merchant strategy objectives (restock, bank-ops, sell, trade-fulfill, deliver, hunt-eval) reference utility functions (`depositJunk()`, `buyItem()`, etc.) that have no contract or signature specification. Infrastructure.md lists utility *categories* but not function signatures. Phase 4 merchant implementation will require inventing these interfaces.
**Fix**: Before Phase 4, author utility function signatures in a dedicated section of infrastructure.md or a new utilities contract. Phase 2-3 systems that use simple utilities (e.g., `loot()`, `open_stand()`) are fine — they're documented game API calls.
**Resolution**: Utility function signatures with full docstrings (intent, params, return) added to infrastructure.md. Derived from hyper-fixate implementations. Covers all phases including Phase 4 signatures.

### H3. Farmability heuristic (R35) has no formula

**Where referenced**: `docs/requirements/world-and-game-systems.md` R35, `docs/intent/world.md` (monster danger assessment), `docs/intent/combat.md` (damage calculation heuristics)
**Impact**: R30 (party-capability targeting) and R37 (hunt evaluation) both depend on R35's farmability assessment. Intent docs describe the *inputs* (HP, XP, gold, attack, frequency) but never specify the actual formula or weighting. Implementer must invent the heuristic.
**Fix**: Define a concrete MVP heuristic. Even a simple formula like `score = xp / estimated_ttk` with TTK from `monster.hp / party_dps` would be sufficient. Document in intent/combat.md or a dedicated section.
**Resolution**: MVP farmability defined as boolean can_fight + data object `{can_fight, gold_gain, xp_gain}` in intent/combat.md. Dedicated utility functions (canFight, estimateTTK, estimateDPS, getFarmabilityData) specified in infrastructure.md. NOT comparative ROI — data for future decision-making.

### H4. Movement kite calculation incomplete for multi-hostile scenarios

**Where referenced**: `docs/contracts/movement.md` (kite strategy), `docs/intent/movement.md` (kiting)
**Impact**: Kiting is survival-critical for ranged/non-tank characters. Contract specifies `kite(target, characterRange, hostileRange)` for a single hostile, but doesn't address multiple simultaneous hostiles. Intent mentions a "70/30 weight split" without defining what the weights represent.
**Fix**: Specify hostile prioritization for kite vector (e.g., nearest hostile, highest damage, or weighted centroid). Clarify the 70/30 weight split (likely: 70% away from hostile, 30% toward party center).
**Resolution**: 70/30 weight was agent-inserted hallucination — removed. Correct kite logic documented in intent/movement.md and contracts/movement.md: nearest attacker, steer up to ±90° from attacker vector, can_move_to() validation, vector length = character.speed * (delay/1000). Triggers on character.targets > 0 AND (not tank OR ranged).

### H5. `character.items[]` item object shape not documented in game-api.md

**Where referenced**: Potion/Regen contract (inventory scan + swap), Objective contract (inventory awareness), Configuration contract
**Impact**: Multiple systems iterate `character.items[]` for potion management, inventory cataloguing, and equipment comparison. The shape of individual item objects (properties like `name`, `level`, `grade`, `quantity`, `type`) is never documented. Implementer must reverse-engineer from server reference or live testing.
**Fix**: Document item object shape in game-api.md. Key properties: `name`, `level`, `grade`, `quantity`, `type` (or whatever the actual property names are). Verify from `common_engine` reference.
**Resolution**: Item shape documented in game-api.md (name, level, q). Verified from server reference. Utility functions in infrastructure.md handle item access patterns.

---

## MEDIUM — Causes friction or requires implementer inference

### M1. 11 requirements not traced to any system in architecture

**Unmapped requirements**: R3, R32, R33, R34, R35, R36, R38, R39, R42, R59, R60

**Breakdown**:
- R3 (Death Recovery `must`): Implicit in Objective recover state but not traced in systems.md
- R33-R35 (Map POI, NPC Nav, Monster Assessment — all `must`): Foundation for Objective and Movement but not explicitly traced. R33/R34 likely belong to Movement or a shared utility; R35 belongs to Objective's target evaluation
- R36 (Pack/Zone `should`), R38 (Server Events `should`): Not yet assigned to systems
- R32, R39, R59, R60 (all `later`): Acceptable deferrals
- R42 (Explicit Responsibilities `must`): Meta/nonfunctional, cross-cutting — doesn't need a system assignment but should be noted

**Fix**: Add R3, R33, R34, R35 to appropriate system requirement lists in systems.md. Note R36, R38 as unassigned `should` items.
**Resolution**: R3, R35 added to Objective. R33, R34 noted as utility-satisfied. R36, R38 noted as unassigned should. Traceability section added to systems.md.

### M2. Objective reads `ctx.config.restockThresholds` — not in context-map

**Where**: `docs/contracts/objective.md` references restockThresholds; `docs/architecture/context-map.md` Objective reads section doesn't list it
**Fix**: Add `ctx.config.restockThresholds` to Objective's reads in context-map.md.
**Resolution**: Added to context-map.md Objective reads section.

### M3. Configuration reload lifecycle not specified

**Where**: `docs/contracts/configuration.md` defines `config.reload()` but doesn't specify who calls it or when
**Impact**: Implementer must trace through objective.md to discover merchant strategy calls reload after updating farm target
**Fix**: Add a "Lifecycle" note to configuration.md: "Called by boot.js on startup, and by Objective merchant strategy after updating farm target or roster in localStorage."
**Resolution**: Config reload by merchant was hallucinated. Fixed: reload is boot-only. Config is immutable after boot. Dynamic values read from localStorage by consuming systems.

### M4. Party tank recalculation trigger is implicit

**Where**: `docs/contracts/party.md` — tank is "recalculated on membership change" but no mechanism specified for detecting membership changes
**Impact**: Implementer must implement a diff-based approach (compare current vs previous partyMembers)
**Fix**: Add implementation note: "Compare `ctx.world.partyMembers` length/composition against previous tick to detect membership changes."
**Resolution**: Diff-based approach rejected. Merchant now assigns tank + party stats via localStorage (`al_bot:party:stats`). All characters read from localStorage. Party contract updated.

### M5. Targeting strategy fallthrough behavior not explicit in tick sequence

**Where**: `docs/contracts/targeting.md:41` — "If a heal strategy returns a `healTarget`, skip remaining strategies. If it returns null, fall through to the next (attack) strategy."
**Impact**: The tick sequence (steps 1-5) doesn't clearly state this fallthrough as a loop. Implementer could misread it as "first strategy wins or nothing."
**Fix**: Clarify in tick step 3: "Iterate strategies in order. For each: call evaluate(). If heal strategy returns non-null healTarget, stop iteration. If it returns null for both targets, continue to next strategy. First strategy returning non-null attackTarget wins."
**Resolution**: Targeting contract tick step 3 rewritten with explicit fallthrough logic.

### M6. Potion tier fallback direction ambiguous

**Where**: `docs/contracts/potion-regen.md:104` — "fall back to the next available tier"
**Impact**: "Next" could mean higher tier (more expensive, more healing) or lower tier (cheaper). Intent is likely: fall to lower tier first (economy), then higher if nothing lower available.
**Fix**: Specify: "Fallback to next lower tier first (e.g., hpot1 → hpot0 → regen). If no lower tier available, fall back to higher tier (e.g., hpot0 unavailable → use hpot1)."
**Resolution**: Higher-tier fallback was hallucinated. Fixed: fallback to lower tier only, then regen. Never higher tier. Potion-regen contract updated.

### M7. `parent.entities` not documented in game-api.md

**Where**: WorldModel contract reads `parent.entities` as primary data source; game-api.md never documents `parent` or its properties
**Impact**: Implementer doesn't know if `parent.entities` is an object (keyed by ID), array, or Map. Doesn't know refresh behavior.
**Fix**: Add `parent` global section to game-api.md documenting `parent.entities` (object keyed by entity ID), `parent.next_skill` (cooldown timestamps), and the `parent` reference itself (game client iframe parent).
**Resolution**: Game Client Globals section added to game-api.md with parent.entities, parent.next_skill. Performance note added: prefer direct property checks over helper functions for hot paths.

### M8. `G.skills` structure not documented

**Where**: Combat Skills contract reads `G.skills` for skill definitions; game-api.md mentions `G.skills` exists but provides no structure
**Impact**: Implementer cannot look up skill cooldowns, ranges, MP costs, or level requirements programmatically
**Fix**: Document `G.skills[skill_name]` shape: `{ cooldown, range, mp, level, ... }`. Verify from server reference.
**Resolution**: G.skills key properties documented in game-api.md Other G Data table. Points to server reference design/skills.js for full schema.

### M9. `character.s.monsterhunt` not documented

**Where**: `docs/contracts/objective.md:127` checks `character.s.monsterhunt` for active hunt detection
**Impact**: Implementer doesn't know the shape of hunt state in `character.s`
**Fix**: Document in game-api.md under character properties: `character.s` (status effects/buffs object), including `monsterhunt` shape `{ id, c, ms, ... }`.
**Resolution**: character.s and character.s.monsterhunt documented in game-api.md Character Properties table.

### M10. Architecture _index.md claims "7 confirmed decisions" but decisions.md has D1-D8

**Where**: `docs/architecture/_index.md:67`
**Fix**: Update to "8 decisions (7 confirmed, 1 noted)" or count D8 as confirmed.
**Resolution**: Updated to "9 architectural decisions (8 confirmed, 1 pending)". D8 formalized, D9 added.

### M11. Context-map Party ordering uses weak "should" language

**Where**: `docs/architecture/context-map.md:224` — "Party should run before Movement"
**Impact**: This is a hard data dependency (Party writes ctx.party.tank/travelSync, Movement reads them), not a preference
**Fix**: Change "should" to "must".
**Resolution**: Changed to "must" in context-map.md.

---

## LOW — Minor inconsistencies or documentation hygiene

### L1. Intent cross-document inconsistency on party composition

`docs/intent/world.md` mentions "mage is available as a rotational character" while `docs/intent/party.md` says "MVP is strictly single-player (4 characters: paladin, ranger, priest, merchant)" with no rotation. Both are true (mage exists but isn't MVP default), but could confuse an implementation agent.
**Fix**: Add clarifying note in world.md: "Mage is available but not part of MVP default party."
**Resolution**: Clarified in both intent/world.md and intent/party.md. MVP accepts all classes in rotation; skill priorities authored for 4 default classes; others use no-op strategies.

### L2. swap() async behavior unverified

`docs/intent/sustain.md` notes "swap() may be async — if so, must await before use_skill." This is referenced in potion-regen contract's inventory management but treated as synchronous.
**Fix**: Verify from server reference and document definitively in game-api.md.
**Resolution**: Verified from server source (runner_functions.js:267-271). swap() is async — returns Promise. Documented in game-api.md. Removed from Unverified section.

### L3. Event catalog scope unclear in data-flow.md

`docs/architecture/data-flow.md` "Signal Catalog" section only lists logging-relevant events but reads as if it's comprehensive.
**Fix**: Rename to "Logging Signal Catalog" or add note "This lists events consumed by the Logging system, not all events."
**Resolution**: Renamed to "Signal Catalog (All Contracted Events)". Note added that this is comprehensive and will grow.

### L4. Infrastructure.md "Planned keys" label misleading

localStorage keys section says "Planned" but most keys are actively used by contracted systems.
**Fix**: Change "Planned" to "Schema" or split into "Active" and "Future" sections.
**Resolution**: Changed to "Schema" in infrastructure.md.

### L5. Merchant complexity revisit point not formalized

`docs/architecture/systems.md:61` mentions extracting a Merchant Operations system as a "documented revisit point" but it's not in decisions.md.
**Fix**: Either add as D9 in decisions.md or soften language in systems.md to "potential future extraction."
**Resolution**: Added as D9 (Pending) in decisions.md.

### L6. `is_on_cooldown()` function inconsistently documented

Combat Skills contract uses `is_on_cooldown(skill_name)` but game-api.md only documents cooldown checking via `parent.next_skill[skill_name]` timestamps. Both may be valid game API surfaces.
**Fix**: Verify and document `is_on_cooldown()` in game-api.md if it exists as a game function.
**Resolution**: Documented with full implementation from game source in game-api.md cooldown section.

### L7. Decision D8 stand ownership ambiguous

`docs/architecture/decisions.md` D8 says stand "touches both" Movement and Objective. Movement contract clarifies Movement closes before movement, Objective (merchant strategy) opens at destination. Decision text could be clearer.
**Fix**: Update D8 to specify: "Movement owns close-before-move. Objective owns open-at-destination."
**Resolution**: D8 updated. Movement handles movement-lifecycle stand management. Other systems may also use stand utilities. Not exclusively Movement.

### L8. External codebase references without links

Multiple intent docs reference "hyper-fixate" and "v2" implementations for logic examples. These are at `../hyper-fixate/` and the `codex` branch / `archive/` directory but links are not provided.
**Fix**: Add a note in `docs/intent/_index.md` pointing to reference implementation locations.
**Resolution**: Reference Implementations section added to intent/_index.md with paths to hyper-fixate, IkeBot/reference repos, and archive. ALClient/caracAL explicitly excluded.

---

## Game-API Documentation Gaps (consolidated)

Functions and globals that need documentation before the systems that use them can be implemented:

| Item | Needed By | Priority |
|------|-----------|----------|
| `interact(npc_type)` | Objective (R37 hunt) | Phase 3 |
| `parent.entities` structure | WorldModel | Phase 1 (already implemented, but undocumented) |
| `parent.next_skill` structure | Combat Skills, Potion/Regen | Phase 2 |
| `character.items[]` item shape | Potion/Regen, Objective | Phase 2 |
| `character.s` (status effects) | Objective (hunt detection) | Phase 3 |
| `character.bank` structure | Objective (R58 banking) | Phase 4 |
| `G.skills[name]` shape | Combat Skills | Phase 2 |
| `G.maps[map].pvp` | WorldModel (future) | Post-MVP |
| `is_on_cooldown(skill)` | Combat Skills | Phase 2 |
| `swap(from, to)` sync/async | Potion/Regen | Phase 2 |
| `upgrade()`, `compound()` | Objective (R26) | Phase 4 |
| `buy()`, `sell()` | Objective (merchant) | Phase 4 |
| `bank_store()`, `bank_retrieve()` | Objective (R58) | Phase 4 |
| `trade()` | Objective (R55) | Phase 4 |
| `send_cm()` rate limits/size | Party | Phase 3 |

**Recommendation**: Expand game-api.md with Phase 2 items before Phase 2 implementation. Phase 3-4 items can be documented just-in-time. Consider splitting game-api.md into focused files (functions.md, globals.md, game-data.md) if it grows past ~500 lines.

---

## Requirement-to-Architecture Traceability Gaps

| Requirement | Priority | Gap |
|-------------|----------|-----|
| R3 (Death Recovery) | `must` | Not traced to any system. Belongs to Objective (recover state). |
| R33 (Map POI) | `must` | Not traced. Belongs to shared utilities or Movement. |
| R34 (NPC Navigation) | `must` | Not traced. Belongs to Movement + utilities. |
| R35 (Monster Assessment) | `must` | Not traced. Belongs to Objective (target evaluation). |
| R36 (Pack/Zone) | `should` | Not assigned. Future concern. |
| R38 (Server Events) | `should` | Not assigned. Future concern. |
| R32, R39, R59, R60 | `later` | Not assigned. Acceptable for MVP. |
| R42 (Explicit Responsibilities) | `must` | Cross-cutting nonfunctional. No system assignment needed but should be noted. |

---

## Contract Implementability Assessment

| Contract | Implementable? | Blockers |
|----------|---------------|----------|
| Scheduler | Yes | — |
| Event Bus | Yes | — |
| WorldModel | Yes | Document `parent.entities` structure (M7) |
| Configuration | Yes | Clarify reload lifecycle (M3) |
| Logging | Yes | — |
| Targeting | Yes | Clarify fallthrough (M5) |
| Attack | Yes | — |
| Combat Skills | Yes | Document `G.skills` shape (M8), `is_on_cooldown` (L6) |
| Potion/Regen | Yes | Document item shape (H5), clarify fallback direction (M6) |
| Movement | Mostly | Kite multi-hostile gap (H4) |
| Objective (hunter) | Mostly | Document `interact()` (H1), `character.s.monsterhunt` (M9) |
| Objective (merchant) | No — Phase 4 | Utility function signatures needed (H2) |
| Party | Yes | Tank recalculation note (M4) |
| Merchant Skills | No contract exists | Planned for Phase 4 |

---

## Recommended Action Sequence

1. **Before Phase 2**: Expand game-api.md with Phase 2 items (parent.entities, parent.next_skill, character.items shape, G.skills, is_on_cooldown, swap behavior)
2. **Before Phase 3**: Add `interact()` and `character.s` to game-api.md. Fix requirement traceability for R3, R33-R35. Clarify H4 kite calculation.
3. **Before Phase 4**: Author merchant utility function signatures. Author Merchant Skills contract. Add remaining game-api items (bank, trade, upgrade, compound, buy, sell).
4. **Anytime (low effort)**: Fix M2, M10, M11, L1-L8 — all are single-line or small paragraph fixes.
